/**
 * backend_supervisor.js — self-launching Python backend for the performer device.
 *
 * Loaded by markov_osc.js (inside Max's node.script). On `init` the device now
 * finds a working Python, starts `python -m src.main` itself, watches its
 * health, and restarts it when it dies — no terminal required. The panel shows
 * a light (green up / amber starting / red down), a text readout, and a Relink
 * button.
 *
 * Design constraints (all verified against Max 9.1.4 / Node for Max 3.0.5 and
 * measured on this backend — do not "simplify" them away):
 *
 *   * Bare `python3` resolves to the bare Apple stub when Live is launched
 *     from the Dock (launchd PATH) — interpreters must be ABSOLUTE paths,
 *     validated by a fast import probe (~0.06s; never `import torch`, ~0.8s).
 *   * Python replies to the FIXED Max port 9001 owned by markov_osc's OSC
 *     server, so this module cannot listen for pongs itself. Liveness is fed
 *     in from outside via noteTraffic(); the authoritative "is a backend
 *     already running" check is an lsof bind-probe of UDP 9000.
 *   * "[Errno 48] Address already in use" from the child means a backend is
 *     ALREADY serving 9000 — adopt it, never restart-loop against it.
 *   * SIGTERM deadlocks the service (signal handler joins its own serve loop)
 *     and Node for Max tears scripts down via IPC, not signals: the only
 *     reliable cleanup is a SYNCHRONOUS process.on('exit') + SIGKILL.
 *   * The definitive readiness marker is the STDERR log line ending in
 *     "sent /status/ready" (markov cold-start ~0.12s). The /status/ready OSC
 *     message fires ~0.5s before neural models actually answer, so OSC
 *     traffic is only corroboration.
 *   * Switching the Model tab to rnn/lstm blocks the (single-threaded)
 *     service while torch loads — the heartbeat must grace that window
 *     instead of declaring a healthy backend down.
 *
 * No `max-api` dependency: all I/O (post/emitState/sendPing) is injected, so
 * the pure decision functions are unit-tested by backend_supervisor.test.js
 * and the engine can be end-to-end tested under plain node.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawn, execFile } = require("child_process");

/* --- tunables (measured; see file header) -------------------------------- */
const PY_PORT = 9000;
const LSOF = "/usr/sbin/lsof";
const PROBE_TIMEOUT_MS = 4000;
const STARTUP_TIMEOUT_MS = 10000; // markov cold-start ~0.12s; huge headroom
const HEARTBEAT_MS = 3000;
const MISSES_TO_DOWN = 3; // ~9-12s of silence before acting
const MAX_RESTARTS = 3;
const STABLE_UP_MS = 30000; // up this long -> crash counter resets
const MODEL_SWITCH_GRACE_MS = 20000; // torch lazy-load blocks pongs

// Validation probe: real import of exactly the pythonosc modules the backend
// needs + find_spec for torch (presence without the slow import).
// Exit 0 = full (osc+torch), 3 = osc only (markov works, no neural), else bad.
const PROBE_SRC =
  "import importlib.util,sys; " +
  "import pythonosc.udp_client, pythonosc.dispatcher, pythonosc.osc_server; " +
  "sys.exit(0 if importlib.util.find_spec('torch') else 3)";

/* --- pure decision helpers (unit-tested) --------------------------------- */

/** Probe exit status -> interpreter capability. */
function interpretProbe(status) {
  if (status === 0) return "full";
  if (status === 3) return "osc";
  return "bad";
}

/** Is this stderr line the service's definitive readiness marker? */
function isReadyLine(line) {
  return /sent \/status\/ready\s*$/.test(String(line));
}

/** Did the child die because another backend already owns the port? */
function isPortCollision(outputTail) {
  return /Address already in use/.test(String(outputTail));
}

/** Exponential backoff for restart attempt n (1-based): 1s, 2s, 4s. */
function restartDelayMs(attempt) {
  const n = Math.max(1, Math.round(Number(attempt) || 1));
  return 1000 * Math.pow(2, n - 1);
}

/** Should a crash reset the attempt counter (it ran stably before dying)? */
function ranStably(upSinceMs, nowMs) {
  return Number.isFinite(upSinceMs) && nowMs - upSinceMs >= STABLE_UP_MS;
}

/** Ordered absolute-path interpreter candidates. Only anaconda works today,
 *  but config/env overrides and repo venvs are honored first so the device
 *  keeps working if the user later provisions one. */
function buildCandidates(env, rootDir, configPython) {
  const c = [];
  if (configPython) c.push(configPython);
  if (env && env.CHORD_PYTHON) c.push(env.CHORD_PYTHON);
  if (rootDir) {
    c.push(path.join(rootDir, "python", ".venv", "bin", "python"));
    c.push(path.join(rootDir, ".venv", "bin", "python"));
  }
  c.push("/opt/anaconda3/bin/python3");
  c.push("/opt/homebrew/bin/python3");
  c.push("/usr/local/bin/python3");
  c.push("/usr/bin/python3");
  return [...new Set(c)];
}

/** Walk up from startDir looking for python/src/main.py (the project root). */
function resolveRoot(startDir, env, existsFn) {
  const exists = existsFn || fs.existsSync;
  if (env && env.CHORD_PY_DIR) {
    // CHORD_PY_DIR points at the python/ folder itself.
    return exists(path.join(env.CHORD_PY_DIR, "src", "main.py"))
      ? path.dirname(env.CHORD_PY_DIR)
      : null;
  }
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    if (exists(path.join(dir, "python", "src", "main.py"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

/** Supervisor state -> the panel light word (drives `sel up starting down`). */
function stateLight(state) {
  if (state === "up_managed" || state === "up_external") return "up";
  if (state === "probing" || state === "starting") return "starting";
  return "down";
}

/* --- the engine ----------------------------------------------------------- */

/**
 * createSupervisor({post, emitState, sendPing, ...testInjection})
 *   post(msg)                 -> Max console
 *   emitState(light, words[]) -> panel light + text (words joined by Max)
 *   sendPing()                -> true if a /control/ping was actually sent
 *                                (false while the OSC client doesn't exist)
 * Test injection (all optional): pyPort, lsofPath, spawnFn, execFileFn,
 * scriptDir, env, heartbeatMs, startupTimeoutMs.
 */
function createSupervisor(opts) {
  const post = opts.post || (() => {});
  const emitState = opts.emitState || (() => {});
  const sendPing = opts.sendPing || (() => false);
  const spawnFn = opts.spawnFn || spawn;
  const execFileFn = opts.execFileFn || execFile;
  const env = opts.env || process.env;
  const scriptDir = opts.scriptDir || __dirname;
  const pyPort = opts.pyPort || PY_PORT;
  const lsofPath = opts.lsofPath || LSOF;
  const heartbeatMs = opts.heartbeatMs || HEARTBEAT_MS;
  const startupTimeoutMs = opts.startupTimeoutMs || STARTUP_TIMEOUT_MS;

  const S = {
    state: "idle", // idle|probing|starting|up_managed|up_external|down
    child: null,
    python: null, // chosen interpreter path
    pythonKind: null, // full | osc
    root: null,
    attempts: 0,
    upSince: null,
    misses: 0,
    graceUntil: 0,
    busy: false,
    stopping: false, // deliberate stop: don't restart on exit
    killedForRestart: false,
    heartbeatTimer: null,
    startupTimer: null,
    respawnTimer: null, // pending backoff respawn — cancelled by adoption/stop
    lastLight: "down",
    lastWords: [],
    outputTail: "", // last chunk of child output, for exit classification
  };

  // NOTE: every panel text must stay <= ~18 chars — the readout is 118px wide.
  function setState(state, words) {
    S.state = state;
    S.lastLight = stateLight(state);
    S.lastWords = words || [];
    emitState(S.lastLight, S.lastWords);
  }

  /** Optional user config next to the script: {"python": "...", "pythonDir": "..."} */
  function readConfig() {
    try {
      const p = path.join(scriptDir, "backend_config.json");
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (err) {
      post(`backend_config.json unreadable: ${err.message || err}`);
    }
    return {};
  }

  /** lsof bind-probe: is anything already serving UDP pyPort? */
  function portBusy(cb) {
    execFileFn(lsofPath, ["-nP", `-iUDP:${pyPort}`], { timeout: 3000 }, (err, stdout) => {
      // exit 0 with output = bound; exit 1 = nothing found = free
      cb(!err && String(stdout).trim().length > 0);
    });
  }

  /** Validate one interpreter with the fast probe. cb("full"|"osc"|"bad"). */
  function probeInterpreter(py, cb) {
    if (!fs.existsSync(py)) return cb("bad");
    execFileFn(py, ["-c", PROBE_SRC], { timeout: PROBE_TIMEOUT_MS }, (err) => {
      cb(interpretProbe(err ? err.code : 0));
    });
  }

  /** Try candidates in order; prefer the first "full", fall back to first "osc". */
  function pickInterpreter(candidates, cb) {
    let oscOnly = null;
    const next = (i) => {
      if (i >= candidates.length) return cb(oscOnly, oscOnly ? "osc" : null);
      probeInterpreter(candidates[i], (kind) => {
        if (kind === "full") return cb(candidates[i], "full");
        if (kind === "osc" && !oscOnly) oscOnly = candidates[i];
        next(i + 1);
      });
    };
    next(0);
  }

  function clearStartupTimer() {
    if (S.startupTimer) {
      clearTimeout(S.startupTimer);
      S.startupTimer = null;
    }
  }

  function clearRespawnTimer() {
    if (S.respawnTimer) {
      clearTimeout(S.respawnTimer);
      S.respawnTimer = null;
    }
  }

  function onUp(kind) {
    clearStartupTimer();
    clearRespawnTimer(); // adoption/readiness supersedes any queued respawn
    S.upSince = Date.now();
    S.misses = 0;
    if (kind === "managed") {
      const suffix = S.pythonKind === "osc" ? ["(no", "torch)"] : ["(managed)"];
      setState("up_managed", ["up", ...suffix]);
    } else {
      setState("up_external", ["up", "(external)"]);
    }
    startHeartbeat();
  }

  function scheduleRestart(reason) {
    if (ranStably(S.upSince, Date.now())) S.attempts = 0; // it worked; fresh slate
    S.upSince = null;
    if (S.attempts >= MAX_RESTARTS) {
      post(`backend: giving up after ${MAX_RESTARTS} restarts — click Relink`);
      setState("down", ["down", "-", "relink?"]);
      return;
    }
    S.attempts += 1;
    const delay = restartDelayMs(S.attempts);
    post(`backend: ${reason} — restart ${S.attempts}/${MAX_RESTARTS} in ${delay}ms`);
    setState("starting", ["restarting", `${S.attempts}/${MAX_RESTARTS}`]);
    clearRespawnTimer();
    S.respawnTimer = setTimeout(() => {
      S.respawnTimer = null;
      spawnChild();
    }, delay);
  }

  function onChildExit(code, signal) {
    clearStartupTimer();
    const tail = S.outputTail;
    S.child = null;
    if (S.stopping) {
      S.killedForRestart = false; // this exit is consumed here; don't let the
      setState("down", ["stopped"]); // stale flag misclassify the NEXT child's death
      return;
    }
    if (S.killedForRestart) {
      S.killedForRestart = false;
      // Same 3-attempt budget as a crash: a backend that repeatedly starts
      // but never answers (startup timeout / silent heartbeat) must not be
      // kill-respawned forever. The >=1s backoff also lets the port free up.
      scheduleRestart("restarting");
      return;
    }
    if (isPortCollision(tail)) {
      // Another backend owns the port (second device instance, crash orphan,
      // or a terminal-launched service): use it instead of fighting it.
      post("backend: port already served — adopting the existing backend");
      onUp("external");
      return;
    }
    scheduleRestart(`exited (code ${code}, signal ${signal})`);
  }

  function spawnChild() {
    if (S.child || S.stopping) return;
    if (!S.python || !S.root) {
      setState("down", ["need", "python-osc"]);
      return;
    }
    S.outputTail = "";
    setState("starting", ["starting..."]);
    const child = spawnFn(S.python, ["-m", "src.main"], {
      cwd: path.join(S.root, "python"),
      detached: false,
      env: Object.assign({}, env, { CHORD_SUPERVISED: "1" }),
    });
    S.child = child;

    const watch = (stream, label) => {
      if (!stream) return;
      let buf = "";
      stream.on("data", (chunk) => {
        buf += String(chunk);
        S.outputTail = (S.outputTail + String(chunk)).slice(-2000);
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const lineText = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (lineText.trim()) post(`py ${label}: ${lineText.trim()}`);
          if (isReadyLine(lineText) && S.state === "starting") onUp("managed");
        }
      });
    };
    watch(child.stdout, "out");
    watch(child.stderr, "err"); // logging (incl. the ready line) is on stderr

    // One classification per child: 'error' (spawn failure) and 'exit' can
    // both fire for the same death; only the first may schedule a restart.
    let settled = false;
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearStartupTimer();
      post(`backend spawn error: ${err.message || err}`);
      S.child = null;
      scheduleRestart("spawn failed");
    });
    child.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      onChildExit(code, signal);
    });

    S.startupTimer = setTimeout(() => {
      if (S.state === "starting" && S.child) {
        post("backend: no ready signal — killing and retrying");
        S.killedForRestart = true;
        try {
          S.child.kill("SIGKILL"); // SIGTERM deadlocks the service; see header
        } catch (err) {
          post(String(err.message || err));
        }
      }
    }, startupTimeoutMs);
  }

  function startHeartbeat() {
    if (S.heartbeatTimer) return;
    S.heartbeatTimer = setInterval(() => {
      if (S.state !== "up_managed" && S.state !== "up_external" && S.state !== "down") return;
      if (!sendPing()) return; // OSC client not up yet: can't measure, don't count
      if (Date.now() < S.graceUntil) return; // model-switch torch load in progress
      S.misses += 1;
      if (S.misses >= MISSES_TO_DOWN && S.state !== "down") onUnresponsive();
    }, heartbeatMs);
    if (S.heartbeatTimer.unref) S.heartbeatTimer.unref();
  }

  function onUnresponsive() {
    if (S.state === "up_managed" && S.child) {
      post("backend: unresponsive — restarting");
      S.killedForRestart = true;
      try {
        S.child.kill("SIGKILL");
      } catch (err) {
        post(String(err.message || err));
      }
      return;
    }
    // External backend went quiet: if its port is free, take over; if it is
    // still bound but silent, report down and wait (noteTraffic self-heals).
    setState("down", ["not", "responding"]);
    portBusy((busy) => {
      if (!busy && !S.stopping) {
        post("backend: external backend gone — taking over");
        ensure();
      }
    });
  }

  /** A backend already owns the port: link to it, but show amber until real
   *  traffic PROVES it answers (a hung-but-bound process must not flash
   *  green). noteTraffic() promotes to up; silence times out to down. */
  function adoptPending() {
    setState("starting", ["linking..."]);
    startHeartbeat();
    clearStartupTimer();
    S.startupTimer = setTimeout(() => {
      if (S.state === "starting" && !S.child) setState("down", ["not", "responding"]);
    }, startupTimeoutMs);
  }

  /* --- public API --------------------------------------------------------- */

  /** Main entry: adopt an existing backend or find python and launch one. */
  function ensure() {
    if (S.busy || S.child) return;
    S.busy = true;
    S.stopping = false;
    S.killedForRestart = false; // any prior kill's exit was already consumed
    setState("probing", ["finding", "python..."]);
    portBusy((busy) => {
      // Re-validate after the await gap: a queued respawn may have spawned,
      // or the user may have clicked stop, while lsof ran.
      if (S.child || S.stopping) {
        S.busy = false;
        return;
      }
      if (busy) {
        S.busy = false;
        post(`backend: UDP ${pyPort} already served — linking to the existing backend`);
        adoptPending();
        return;
      }
      const cfg = readConfig();
      S.root = resolveRoot(scriptDir, env, null);
      if (cfg.pythonDir && fs.existsSync(path.join(cfg.pythonDir, "src", "main.py"))) {
        S.root = path.dirname(cfg.pythonDir);
      }
      if (!S.root) {
        S.busy = false;
        post("backend: python/src/main.py not found — set CHORD_PY_DIR or backend_config.json");
        setState("down", ["no", "python", "dir"]);
        return;
      }
      pickInterpreter(buildCandidates(env, S.root, cfg.python), (py, kind) => {
        S.busy = false;
        if (S.child || S.stopping) return; // same re-validation after probing
        if (!py) {
          post("backend: no python with python-osc found — pip install python-osc, or set backend_config.json");
          setState("down", ["need", "python-osc"]);
          return;
        }
        S.python = py;
        S.pythonKind = kind;
        post(`backend: using ${py} (${kind === "full" ? "osc+torch" : "osc only — markov model only"})`);
        spawnChild();
        startHeartbeat();
      });
    });
  }

  /** Relink button: fresh attempt budget; restart managed / re-probe external. */
  function restart() {
    S.attempts = 0;
    S.stopping = false;
    if (S.child) {
      S.killedForRestart = true;
      try {
        S.child.kill("SIGKILL");
      } catch (err) {
        post(String(err.message || err));
      }
      return;
    }
    ensure();
  }

  /** Deliberate stop (no restart). */
  function stopManaged() {
    S.stopping = true;
    clearRespawnTimer();
    clearStartupTimer();
    if (S.child) {
      try {
        S.child.kill("SIGKILL");
      } catch (err) {
        post(String(err.message || err));
      }
    } else {
      setState("down", ["stopped"]);
    }
  }

  /** Any OSC message from Python proves it is alive. Fed by markov_osc.emit. */
  function noteTraffic() {
    S.misses = 0;
    if (S.state === "down") onUp("external"); // it came back on its own
    else if (S.state === "starting" && !S.child) onUp("external");
  }

  /** Suspend down-detection (e.g. while a model switch loads torch). */
  function grace(ms) {
    S.graceUntil = Date.now() + (Number(ms) || MODEL_SWITCH_GRACE_MS);
  }

  /** Re-emit the current state (e.g. after a panel override is lifted). */
  function announce() {
    emitState(S.lastLight, S.lastWords);
  }

  // The ONLY teardown hook that runs on a normal device close is a synchronous
  // 'exit' handler (Node for Max stops scripts via IPC, so signal handlers
  // never fire). SIGKILL because the service's SIGTERM handler deadlocks.
  process.on("exit", () => {
    if (S.child) {
      try {
        S.child.kill("SIGKILL");
      } catch (err) {
        /* already gone */
      }
    }
  });

  return {
    ensure,
    restart,
    stopManaged,
    noteTraffic,
    grace,
    announce,
    /** test/debug introspection only */
    _state: S,
  };
}

module.exports = {
  createSupervisor,
  // pure helpers, unit-tested:
  interpretProbe,
  isReadyLine,
  isPortCollision,
  restartDelayMs,
  ranStably,
  buildCandidates,
  resolveRoot,
  stateLight,
  PROBE_SRC,
  STABLE_UP_MS,
  MAX_RESTARTS,
};
