/**
 * onnx_markov_osc.js — Python-free bridge for the ONNX chord devices.
 *
 * This is markov_osc.js with the OSC transport and the Python supervisor cut
 * out. Chord SELECTION happens in-process (engine/local_engine.js: corpus-blend
 * Markov, JazzNet RNN/LSTM through ONNX or a pure-JS forward pass, and the
 * phrase generator); everything downstream — voicing, the auto-player, every
 * Max.outlet selector — is unchanged, so the same patches, the same
 * chord_parser.js and the same performance_map.js drive it.
 *
 * WHY A COPY AND NOT A REFACTOR: `markov_osc.js` is loaded by three shipping
 * devices. Extracting a shared core would mean editing that file, and the only
 * thing the two bridges would share is transport glue — the pure logic
 * (chord_parser, performance_map, engine/*) is already single-source. The
 * duplication is bounded to this file's plumbing and is the conservative trade.
 * Fixes to the PLAYER belong in both files; see ONNX_DEVICE.md.
 *
 * Node -> Max message protocol: IDENTICAL to markov_osc.js.
 *   status/output/error/chord/notes/stop/playoff, the readout selectors, and
 *   backendstate/backendtext — which here report the LOCAL engine's load state
 *   (`starting` while models load, `up` once ready, `down` on failure) rather
 *   than a Python process's health.
 *
 * The `/chord/output`, `/phrase/output`, `/status/*` and `/error` addresses
 * survive as INTERNAL routing keys into emit(), which is still the single sink
 * that voices a chord and talks to Max. Nothing sends them over a socket.
 *
 * PROJECT CONSTRAINT: only MAJOR or MINOR triads are sonified. `chord` always
 * shows the full symbol the model returned; the `notes` are the reduced triad.
 */

const Max = require("max-api");
const parser = require("./chord_parser.js");
const perf = require("./performance_map.js");
const { createLocalEngine } = require("./engine/local_engine.js");

// A local generation is sub-millisecond once the models are loaded; this only
// guards the cold-start path (loading the ONNX graphs) and a promise that never
// settles. It is not a network timeout — there is no network.
const REPLY_TIMEOUT_MS = 2000;

let replyTimer = null;
let manualPing = false; // echo 'ready' only for user-initiated pings

// --- local engine lifecycle ----------------------------------------------
// The models load asynchronously; the panel light follows. Until `up`, the
// phrase clock stays gated and chord requests queue behind the init promise.
let engine = null;
let enginePromise = null;

function emitEngineState(light, words) {
  Max.outlet(["backendstate", light]);
  Max.outlet(["backendtext", ...words]);
}

/** Idempotent: returns the in-flight or settled init promise. */
function withEngine() {
  if (enginePromise) return enginePromise;
  emitEngineState("starting", ["loading", "models"]);
  engine = createLocalEngine({ post: (m) => Max.post(m) });
  enginePromise = engine
    .init()
    .then((result) => {
      if (!result.ok) throw new Error(result.error);
      emitEngineState("up", engine.statusWords());
      for (const w of result.warnings || []) Max.post(`engine warning: ${w}`);
      Max.outlet(["status", "ready"]);
      Max.outlet(["modelstat", engine.activeModel()]);
      emitSessionStatus();
      return engine;
    })
    .catch((err) => {
      emitEngineState("down", engine && engine.statusWords ? engine.statusWords() : ["engine", "error"]);
      Max.post(`local engine failed: ${err.stack || err}`);
      Max.outlet(["error", String(err.message || err)]);
      enginePromise = null; // let Reload retry from scratch
      throw err;
    });
  return enginePromise;
}

/** Hard re-init: drop the loaded models and build them again. */
function restartEngine() {
  enginePromise = null;
  engine = null;
  withEngine().catch(() => {}); // the panel already shows the failure
}

// --- chord voicing / sonification state ---------------------------------
const voicingOptions = {
  registerCenter: 60, // approx C4
  low: 48, // C3
  high: 72, // C5
  voiceLeadingEnabled: true,
  triadsOnly: true,
  colorMajor: 0,
  colorMinor: 0,
  color7th: 0,
  extensions: [],
  drop2: false,
  spreadCap: 24,
  voiceDistanceSteps: [],
  currentKey: "C:maj",
};
let previousVoicing = null; // last MIDI voicing, for nearest-voicing mode

// --- auto-player state (walks the chain over a harmonic template) --------
const TEMPLATES = {
  1: { name: "whole_bar", spanBars: 1, onsets: [0] },
  2: { name: "half_half", spanBars: 1, onsets: [0, 2] },
  3: { name: "four_quarters", spanBars: 1, onsets: [0, 1, 2, 3] },
  4: { name: "half_qtr_qtr", spanBars: 1, onsets: [0, 2, 3] },
  5: { name: "qtr_qtr_half", spanBars: 1, onsets: [0, 1, 2] },
  6: { name: "qtr_half_qtr", spanBars: 1, onsets: [0, 1, 3] },
  7: { name: "static_2bar", spanBars: 2, onsets: [0] },
};
const RHYTHM_ORDER = [7, 1, 2, 4, 6, 5, 3];
const player = {
  active: false,
  templateId: 2,
  pendingTemplateId: null,
  lengthBars: 4,
  beat: -1,
  pending: null,
  lastSounded: null,
  seed: "C:maj",
  keyRoot: 0,
  keyMode: "maj",
  mode: "oneshot",
  phrase: new Map(),
  capturing: true,
  hold: false,
  dirty: false,
  engine: "walk",
  phraseReady: false,
  schedule: new Map(),
  totalTicks: 0,
  nextPlan: null,
  plan: null,
  cadence: 1.0,
};

function clearReplyTimeout() {
  if (replyTimer) {
    clearTimeout(replyTimer);
    replyTimer = null;
  }
}

function startReplyTimeout() {
  clearReplyTimeout();
  replyTimer = setTimeout(() => {
    Max.outlet(["error", "reply timeout"]);
    if (player.engine === "phrase" && player.active && !player.phraseReady) {
      Max.post("phrase: no reply — holding the seed chord");
      installPhrase([{ chord: player.seed, durBeats: player.lengthBars * 4 }]);
    }
  }, REPLY_TIMEOUT_MS);
}

/**
 * Parse a returned chord symbol, voice it, and emit the display + MIDI branch
 * messages. Used by the model reply path and the manual TEST PARSER path.
 * Never throws.
 */
function sonifyChord(symbol, source) {
  let result;
  try {
    result = parser.chordToNotes(symbol, voicingOptions, previousVoicing);
  } catch (err) {
    Max.post(`chord parse crash: ${err.stack || err}`);
    Max.outlet(["error", "parser_exception", String(symbol)]);
    return;
  }

  Max.outlet(["chord", result.normalizedSymbol]);

  if (result.error) {
    Max.outlet(["error", result.error.code, result.error.detail]);
    return;
  }

  if (result.isNoChord) {
    previousVoicing = null;
    Max.outlet(["stop"]);
    Max.post(`${source}: no-chord -> silence`);
    return;
  }

  previousVoicing = result.notes;
  Max.outlet(["notes", ...result.notes]);
  Max.post(
    `${source}: ${result.normalizedSymbol} -> ${result.triadQuality} triad ` +
      `notes ${result.notes.join(" ")}`
  );
}

/**
 * The single internal result sink, byte-for-byte the logic markov_osc.js runs
 * on an incoming OSC packet. Here it is called directly by the local engine's
 * resolved promises instead of by a UDP listener.
 */
function emit(address, args) {
  if (address === "/phrase/output") {
    clearReplyTimeout();
    // Flat alternating list: chord, durBeats, chord, durBeats, ...
    const plan = [];
    for (let i = 0; i + 1 < args.length; i += 2) {
      const chord = String(args[i] ?? "").trim();
      const durBeats = Math.max(1, Math.round(Number(args[i + 1])) || 1);
      if (chord) plan.push({ chord, durBeats });
    }
    if (!plan.length) {
      Max.outlet(["error", "empty phrase"]);
      return;
    }
    player.seed = plan[plan.length - 1].chord; // next phrase continues from here
    if (player.phraseReady) {
      player.nextPlan = plan; // a REGEN pre-fetch: don't disturb the playing phrase
      Max.post(`phrase: pre-fetched ${plan.length} chords for the next cycle`);
    } else {
      installPhrase(plan);
    }
    Max.outlet(["chord", plan[0].chord]);
    return;
  }

  if (address === "/chord/output") {
    clearReplyTimeout();
    const symbol = String(args[0] ?? "");
    Max.outlet(["output", symbol]);
    player.seed = symbol;
    if (player.active) {
      player.pending = symbol;
    } else {
      sonifyChord(symbol, "markov");
    }
    return;
  }

  if (address === "/status/ready") {
    Max.outlet(["status", "ready"]);
    return;
  }

  if (address === "/status/pong") {
    if (manualPing) {
      manualPing = false;
      Max.outlet(["status", "ready"]);
    }
    return;
  }

  if (address === "/status/model") {
    Max.outlet(["modelstat", String(args[0] ?? "markov")]);
    return;
  }

  if (address === "/status/session") {
    Max.outlet(["sessionstat", String(args[0] ?? "stateless"), Number(args[1] ?? 0)]);
    return;
  }

  if (address === "/error") {
    Max.outlet(["error", String(args[0] ?? "unknown error")]);
    return;
  }

  if (address.startsWith("/debug/")) {
    Max.post(`debug ${address} ${args.join(" ")}`);
  }
}

function emitSessionStatus() {
  if (!engine) return;
  emit("/status/session", engine.sessionStatus());
}

Max.addHandler("init", () => {
  manualPing = true;
  emitCapstate(); // panel shows "idle" until PLAY
  withEngine().catch(() => {});
});

/* --- engine panel controls ---------------------------------------------- *
 * The patch still sends `backendrestart` (the Reload button). With no Python
 * to supervise, the useful meaning is "rebuild the local engine".            */
Max.addHandler("backendrestart", () => restartEngine());
Max.addHandler("backendstop", () => {
  Max.post("no external backend to stop — this device runs the models in-process");
});
Max.addHandler("backendstart", () => {
  withEngine().catch(() => {});
});

Max.addHandler("ping", () => {
  manualPing = true;
  withEngine()
    .then(() => emit("/status/pong", []))
    .catch(() => {});
});

/**
 * Collapse the atoms a `send` message carries into one chord string.
 */
function chordFromArgs(args) {
  const parts = args.map((a) => String(a ?? "").trim()).filter(Boolean);
  if (parts.length > 1 && parts[0] === "text") {
    return parts.slice(1).join(" ").trim();
  }
  return parts.join(" ").trim();
}

/**
 * Ask the active model for the successor of `value`. Shared by the Send
 * button/Enter path, the auto-player and the MIDI-note-in path, so the sonified
 * chord is always the model's reply — never merely the chord the user typed.
 */
function submitChord(value) {
  const v = String(value ?? "").trim();
  if (!v) {
    Max.outlet(["error", "empty chord input"]);
    return;
  }
  startReplyTimeout();
  withEngine()
    .then((e) => e.sample(v))
    .then((res) => {
      clearReplyTimeout();
      if (res.error) Max.outlet(["error", res.error]);
      if (res.output == null) return;
      emit("/chord/output", [res.output]);
      emitSessionStatus();
    })
    .catch((err) => {
      clearReplyTimeout();
      Max.post(err.stack || err);
      Max.outlet(["error", String(err.message || err)]);
    });
}

Max.addHandler("send", (...args) => {
  submitChord(chordFromArgs(args));
});

/** Re-read the JSON assets (corpora + phrase model). Weights stay loaded. */
Max.addHandler("reload", () => {
  withEngine()
    .then((e) => {
      const r = e.reload();
      if (!r.ok) {
        Max.outlet(["error", r.error]);
        return;
      }
      if (r.warning) Max.post(`reload warning: ${r.warning}`);
      Max.outlet(["status", "ready"]);
    })
    .catch(() => {});
});

/* -----------------------------------------------------------------------
 * SPICE controls — these act UPSTREAM on which chord the model PICKS, and are
 * distinct from the `colormajor/colorminor/color7th` VOICING knobs further
 * below (those recolour the sonified triad after the chord has been chosen).
 *
 *   color     0..1  morph corpus flavour: folk -> pop -> classical -> jazz
 *   adventure 0..1  temperature: safe/common -> surprising/rare
 *   spice     0..1  macro: drives color AND adventure together
 *   gravity   0..1  harmonic pull toward the tonic/dominant (cadence resolve)
 *   key       sym   current song key ("C:maj"/"A:min") for transposition
 * --------------------------------------------------------------------- */
function forwardDial(param, v) {
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  withEngine()
    .then((e) => {
      if (param === "color") e.setColor(x);
      else if (param === "adventure") e.setAdventure(x);
      else if (param === "spice") e.setSpice(x);
      else if (param === "gravity") e.setGravity(x);
    })
    .catch(() => {});
}
Max.addHandler("color", (v) => forwardDial("color", v));
Max.addHandler("adventure", (v) => forwardDial("adventure", v));
Max.addHandler("spice", (v) => forwardDial("spice", v));
Max.addHandler("gravity", (v) => forwardDial("gravity", v));
Max.addHandler("key", (...atoms) => {
  const k = chordFromArgs(atoms); // reuse: strips a leading "text"/quotes
  if (!k) {
    Max.outlet(["error", "empty key"]);
    return;
  }
  voicingOptions.currentKey = k; // scale context for the added-harmony voice
  withEngine()
    .then((e) => e.setKey(k))
    .catch(() => {});
});

/**
 * TEST PARSER — parse/voice/sonify a chord DIRECTLY, bypassing the model.
 */
Max.addHandler("testparse", (...atoms) => {
  const symbol = chordFromArgs(atoms);
  if (!symbol) {
    Max.outlet(["error", "empty test chord"]);
    return;
  }
  sonifyChord(symbol, "test");
});

/**
 * MIDI note-in seeds the chain: a played note's pitch class becomes a
 * major-triad root symbol and is submitted exactly like a typed chord.
 */
const ROOT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

Max.addHandler("notein", (note, velocity) => {
  const n = Number(note);
  if (!Number.isFinite(n)) return;
  if (velocity !== undefined && Number(velocity) === 0) return; // ignore note-offs
  const pc = ((Math.round(n) % 12) + 12) % 12;
  submitChord(ROOT_NAMES[pc] + ":maj");
});

/* -----------------------------------------------------------------------
 * Auto-player: play along the chain for a set number of bars, using a
 * harmonic-rhythm template to decide when chords change.
 * --------------------------------------------------------------------- */
let ticksPerBar = 4;
let tripletOnsets = null;

function templateCycleBeats(id) {
  return (TEMPLATES[id] || TEMPLATES[3]).spanBars * 4;
}
function isSlotOnset(id, beatInCycle) {
  return (TEMPLATES[id] || TEMPLATES[3]).onsets.indexOf(beatInCycle) !== -1;
}
function isOnsetAt(b) {
  if (tripletOnsets) return tripletOnsets.indexOf(b % ticksPerBar) !== -1;
  return isSlotOnset(player.templateId, b % templateCycleBeats(player.templateId));
}

/** Reset the neural (rnn/lstm) hidden-state session. No-op for markov. */
function resetSession() {
  withEngine()
    .then((e) => {
      e.resetSession();
      emitSessionStatus();
    })
    .catch(() => {});
}

/** Report capture/loop state to the panel: capturing | looping | idle. */
function emitCapstate() {
  Max.outlet(["capstate", player.active ? (player.capturing ? "capturing" : "looping") : "idle"]);
}

/* -----------------------------------------------------------------------
 * PHRASE ENGINE — the sequence, not the chord, is the unit.
 * --------------------------------------------------------------------- */

function currentKey() {
  return `${ROOT_NAMES[((player.keyRoot % 12) + 12) % 12]}:${player.keyMode}`;
}

/** A parameter that shapes the phrase changed: re-generate next cycle, and drop
 *  any pre-fetched phrase built from the old settings. */
function invalidatePhrase() {
  player.dirty = true;
  player.nextPlan = null;
}

/**
 * Generate a whole phrase locally. The clock stays gated until it lands.
 *
 * The result is delivered on a LATER turn of the event loop, exactly as a UDP
 * reply was. This is load-bearing: beginPhraseCycle() rewinds `beat` to -1
 * before calling here, and a synchronous install would leave it at -1 for the
 * tick that is still running, swallowing the phrase's first chord.
 */
function requestPhrase() {
  startReplyTimeout();
  withEngine()
    .then((e) => {
      const plan = e.generatePhrase({
        key: currentKey(),
        bars: player.lengthBars,
        cadence: player.cadence,
        seedChord: player.seed,
      });
      const flat = [];
      for (const [chord, dur] of plan) {
        flat.push(chord);
        flat.push(dur);
      }
      setImmediate(() => emit("/phrase/output", flat));
    })
    .catch((err) => {
      clearReplyTimeout();
      Max.post(`phrase generation failed: ${err.stack || err}`);
      Max.outlet(["error", `phrase generation failed: ${err.message || err}`]);
      // Never leave the clock gated forever: hold the seed for the whole phrase.
      if (player.engine === "phrase" && player.active && !player.phraseReady) {
        installPhrase([{ chord: player.seed, durBeats: player.lengthBars * 4 }]);
      }
    });
}

/** Turn [{chord, durBeats}, ...] into a tick -> chord schedule and arm the clock. */
function installPhrase(plan) {
  if (!plan || !plan.length) return;
  const { schedule, totalTicks } = perf.phraseSchedule(plan, ticksPerBar);
  player.plan = plan; // kept so the grid can be rebuilt if Triplet toggles
  player.schedule = schedule;
  player.totalTicks = totalTicks;
  player.phraseReady = true;
  player.capturing = false;
  player.dirty = false;
  emitCapstate();
  Max.post(`phrase: ${plan.length} chords over ${totalTicks} ticks`);
}

/** Re-lay the installed phrase onto a new tick grid (Triplet toggled). */
function reschedulePhrase() {
  if (!player.plan) return;
  const { schedule, totalTicks } = perf.phraseSchedule(player.plan, ticksPerBar);
  player.schedule = schedule;
  player.totalTicks = totalTicks;
  if (player.beat >= totalTicks) player.beat = totalTicks - 1;
}

/** Start the next cycle. LOOP replays the same schedule with no generation. */
function beginPhraseCycle() {
  if (player.mode === "loop" && !player.dirty) {
    emitCapstate();
    return; // deterministic replay of the phrase already installed
  }
  if (player.nextPlan) {
    installPhrase(player.nextPlan); // pre-fetched: no gap at the boundary
    player.nextPlan = null;
    return; // caller's beat is already 0 -> the first chord sounds on this tick
  }
  player.phraseReady = false; // gate the clock rather than play a stale phrase
  // Rewind one tick: while gated every tick is swallowed, so the first tick
  // AFTER the phrase lands must advance to 0 and sound the phrase's first
  // chord. Leaving beat at 0 here would advance to 1 and drop it.
  player.beat = -1;
  player.capturing = true;
  emitCapstate();
  requestPhrase();
}

function phraseBeat() {
  if (!player.phraseReady) return; // gated: the phrase has not arrived yet
  if (player.hold) return; // vamp: don't advance, let the current chord sustain

  player.beat += 1;
  if (player.beat >= player.totalTicks) {
    if (player.mode === "oneshot") {
      playerStop("done");
      return;
    }
    player.beat = 0;
    beginPhraseCycle();
    if (!player.phraseReady) return; // still waiting on a fresh phrase
  }

  // REGEN: fetch the next phrase a bar early so the boundary never stalls.
  // Deliberately NOT gated on `dirty`: requestPhrase() reads the current bars/
  // key/cadence, so a pre-fetch made after a param change is already correct —
  // and gating on it would disable pre-fetch entirely (switching to regen sets
  // dirty, which only clears once a phrase installs).
  if (player.mode === "regen" && !player.nextPlan &&
      player.beat === Math.max(0, player.totalTicks - ticksPerBar)) {
    requestPhrase();
  }

  const chord = player.schedule.get(player.beat);
  if (chord) {
    sonifyChord(chord, "phrase");
    player.lastSounded = chord;
  }
}

function playerStart() {
  player.active = true;
  player.beat = -1;
  player.pending = null;
  player.lastSounded = null;
  player.phrase.clear();
  player.capturing = true; // first pass always captures
  player.dirty = false;

  if (player.engine === "phrase") {
    player.phraseReady = false; // the clock waits for the phrase; no silence, no wrong chord
    player.nextPlan = null;
    player.schedule.clear();
    Max.post(`player: start phrase ${player.mode} ${player.lengthBars} bars in ${currentKey()}`);
    Max.outlet(["status", "playing"]);
    emitCapstate();
    requestPhrase();
    return;
  }

  resetSession(); // fresh neural walk from the seed
  const t = TEMPLATES[player.templateId] || TEMPLATES[3];
  Max.post(
    `player: start ${player.mode} ${player.lengthBars} bars, template ${t.name}, seed ${player.seed}`
  );
  Max.outlet(["status", "playing"]);
  emitCapstate();
  submitChord(player.seed); // fetch the first chord to play on beat 0
}

function playerStop(reason) {
  if (!player.active) return; // idempotent — avoids playoff/toggle feedback loops
  player.active = false;
  previousVoicing = null;
  Max.outlet(["stop"]); // silence held notes
  Max.outlet(["playoff"]); // stop the transport metro + reset the PLAY toggle
  Max.outlet(["status", reason || "stopped"]);
  emitCapstate();
  Max.post(`player: ${reason || "stopped"}`);
}

/** Reroll: discard the captured phrase and walk a fresh one from the seed. */
function playerReroll() {
  if (!player.active) return;
  player.phrase.clear();
  player.capturing = true;
  player.beat = -1;
  player.pending = null;
  player.lastSounded = null;
  player.dirty = false;
  Max.outlet(["status", "reroll"]);
  emitCapstate();
  Max.post("player: reroll");
  if (player.engine === "phrase") {
    player.phraseReady = false; // gate, then walk in on the fresh phrase
    player.nextPlan = null;
    requestPhrase();
    return;
  }
  resetSession();
  submitChord(player.seed);
}

/** Begin a new phrase cycle at a boundary, honoring the current mode. */
function beginCycle() {
  if (player.pendingTemplateId != null) {
    player.templateId = player.pendingTemplateId;
    player.pendingTemplateId = null;
  }
  if (player.mode === "loop" && !player.dirty) {
    player.capturing = false; // replay the phrase we just captured
  } else {
    player.seed = perf.lastPhraseChord([...player.phrase], player.seed);
    player.phrase.clear();
    player.capturing = true;
    player.pending = null;
    player.lastSounded = null;
  }
  player.dirty = false;
  emitCapstate();
}

function playerBeat() {
  if (!player.active) return;
  if (player.engine === "phrase") {
    phraseBeat();
    return;
  }
  player.beat += 1;

  if (player.beat >= player.lengthBars * ticksPerBar) {
    if (player.mode === "oneshot") {
      playerStop("done");
      return;
    }
    player.beat = 0;
    beginCycle();
  }
  const b = player.beat;

  if (player.hold) {
    if (isOnsetAt(b)) {
      const c = player.phrase.get(b) || player.pending || player.seed;
      sonifyChord(c, "hold");
    }
    return;
  }

  if (b % ticksPerBar === 0 && player.capturing && player.pendingTemplateId != null) {
    player.templateId = player.pendingTemplateId;
    player.pendingTemplateId = null;
  }

  if (!isOnsetAt(b)) return;

  if (player.capturing) {
    const chord = perf.captureFallbackChord(player.pending, player.lastSounded, player.seed);
    player.pending = null;
    sonifyChord(chord, "player"); // play the current chord
    player.lastSounded = chord;
    player.phrase.set(b, chord); // record it for LOOP replay
    submitChord(chord); // ask the model for its successor -> becomes pending
  } else {
    // LOOP replay — deterministic, no generation.
    const chord = player.phrase.get(b) || player.lastSounded || player.seed;
    sonifyChord(chord, "loop");
    player.lastSounded = chord;
  }
}

Max.addHandler("play", (value) => {
  if (Number(value) !== 0) playerStart();
  else playerStop("stopped");
});

/** Quarter-note clock tick from a transport-synced metro in Max. */
Max.addHandler("beat", () => {
  playerBeat();
});

/** Choose the harmonic-rhythm template directly (1..7). */
Max.addHandler("template", (value) => {
  const id = Math.round(Number(value));
  if (TEMPLATES[id]) {
    player.templateId = id;
    player.pendingTemplateId = null;
    Max.post(`player: template ${id} (${TEMPLATES[id].name})`);
  }
});

function rhythmToTemplate(v) {
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  const idx = Math.round(x * (RHYTHM_ORDER.length - 1));
  return RHYTHM_ORDER[idx];
}
Max.addHandler("rhythm", (value) => {
  const id = rhythmToTemplate(value);
  player.pendingTemplateId = id;
  if (!player.active) player.templateId = id; // apply now when stopped
  player.dirty = true; // a LOOP re-captures with the new rhythm next cycle
  Max.outlet(["rhythmname", TEMPLATES[id].name]);
});

/** Set the predetermined length in bars. */
Max.addHandler("length", (value) => {
  const n = Math.round(Number(value));
  if (Number.isFinite(n) && n > 0) {
    player.lengthBars = n;
    player.dirty = true;
    Max.post(`player: length ${n} bars`);
  }
});

/** Explicit seed override (optional; the chain also tracks the latest chord). */
Max.addHandler("seed", (...atoms) => {
  const s = chordFromArgs(atoms);
  if (s) {
    player.seed = s;
    Max.post(`player: seed ${s}`);
  }
});

/* --- List selectors (replace typing): Seed / Key / Model dials ---------- */
Max.addHandler("seedsel", (v) => {
  player.seed = perf.seedFromDial(v);
  Max.outlet(["seedname", player.seed]);
});
Max.addHandler("keysel", (v) => {
  player.keyRoot = perf.keyRootFromDial(v); // 0..11 pitch class
  sendKey();
});
Max.addHandler("keymin", (v) => {
  player.keyMode = Number(v) !== 0 ? "min" : "maj";
  sendKey();
});
/** Audition the currently-selected seed chord immediately (preview button). */
Max.addHandler("audition", () => sonifyChord(player.seed, "audition"));

/** Switch the active model. Loading is instant — the weights are already in. */
function sendModel(m) {
  Max.outlet(["modelname", m]);
  withEngine()
    .then((e) => {
      const r = e.setModel(m);
      if (!r.ok) {
        Max.outlet(["error", r.error]);
        return;
      }
      emit("/status/model", [e.activeModel()]);
      emitSessionStatus();
    })
    .catch(() => {});
}

/** Generative model selector (markov / rnn / lstm). */
Max.addHandler("modelsel", (v) => sendModel(perf.modelFromDial(v)));

/**
 * Model selector fed by a live.tab. The last entry ("phrase") is not a registry
 * model but a different ENGINE: it composes a whole phrase with its own
 * generated harmonic rhythm, instead of walking one chord per template onset.
 */
Max.addHandler("modelidx", (i) => {
  const m = perf.modelFromIndex(i);
  if (m === "phrase") {
    player.engine = "phrase";
    Max.outlet(["modelname", "phrase"]);
    Max.post("engine: phrase (sequence-level, learned harmonic rhythm)");
    if (player.active) playerReroll(); // swap engines cleanly at the next phrase
    return;
  }
  const wasPhrase = player.engine === "phrase";
  player.engine = "walk";
  sendModel(m);
  if (wasPhrase && player.active) playerReroll();
});

/**
 * Cadence (0..1): how strongly the phrase pulls home. In PHRASE mode it is both
 * the tonal gravity applied while generating and the probability of ending on
 * an authentic V -> I. In WALK mode it drives the per-step gravity, which is the
 * same musical idea at chord scale.
 */
Max.addHandler("cadence", (v) => {
  player.cadence = clamp01(v);
  if (player.engine === "phrase") {
    invalidatePhrase(); // the next cycle re-generates with the new pull
  } else {
    forwardDial("gravity", player.cadence);
  }
});

/** Phrase length fed by a live.tab (sends the item INDEX 0..3 -> 2/4/8/16 bars). */
Max.addHandler("lenidx", (i) => {
  player.lengthBars = perf.barsFromIndex(i);
  invalidatePhrase();
  Max.outlet(["phraselenbars", player.lengthBars]);
});

/** Neural session mode control (auto | stateless | session | reset). */
Max.addHandler("session", (...atoms) => {
  const mode = atoms.map((a) => String(a ?? "").trim()).filter(Boolean).join(" ").trim().toLowerCase();
  if (!mode) {
    Max.outlet(["error", "empty session mode"]);
    return;
  }
  Max.outlet(["sessionmodename", mode]);
  withEngine()
    .then((e) => {
      const r = e.setSessionMode(mode);
      if (!r.ok) {
        Max.outlet(["error", r.error]);
        return;
      }
      emitSessionStatus();
    })
    .catch(() => {});
});

/** Set the register centre used by the voicing engine (Max-side control). */
Max.addHandler("register", (value) => {
  const v = Number(value);
  if (Number.isFinite(v)) {
    voicingOptions.registerCenter = v;
    voicingOptions.low = Math.max(0, Math.round(v - 12));
    voicingOptions.high = Math.min(127, Math.round(v + 12));
    Max.post(`register center -> ${v} (range ${voicingOptions.low}..${voicingOptions.high})`);
  }
});

/** Toggle nearest-voicing (voice leading) on/off. */
Max.addHandler("voiceleading", (value) => {
  voicingOptions.voiceLeadingEnabled = Number(value) !== 0;
  Max.post(`voice leading -> ${voicingOptions.voiceLeadingEnabled ? "on" : "off"}`);
});

/** Toggle major/minor-triads-only sonification. Default ON. */
Max.addHandler("triadsonly", (value) => {
  voicingOptions.triadsOnly = Number(value) !== 0;
  previousVoicing = null; // voice count changes -> reset voice-leading history
  Max.post(`triads only -> ${voicingOptions.triadsOnly ? "on" : "off"}`);
});

/* --- performable colour knobs (live.dials, 0..1) ----------------------- */
function clamp01(v) {
  v = Number(v);
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
Max.addHandler("colormajor", (v) => {
  voicingOptions.colorMajor = clamp01(v);
});
Max.addHandler("colorminor", (v) => {
  voicingOptions.colorMinor = clamp01(v);
});
Max.addHandler("color7th", (v) => {
  voicingOptions.color7th = clamp01(v);
});

/* --- Phrase controls --------------------------------------------------- */
Max.addHandler("phraselen", (v) => {
  player.lengthBars = perf.barsFromDial(v);
  invalidatePhrase();
  Max.outlet(["phraselenbars", player.lengthBars]);
});
Max.addHandler("phrasemode", (v) => {
  player.mode = perf.modeFromValue(v);
  player.dirty = true;
  Max.outlet(["phrasemodename", player.mode]);
  Max.post(`player: mode ${player.mode}`);
});
Max.addHandler("reroll", () => playerReroll());
Max.addHandler("hold", (v) => {
  player.hold = Number(v) !== 0;
  Max.post(`player: hold ${player.hold ? "on" : "off"}`);
});
/** Triplet feel: switch the beat grid between straight quarters (4/bar) and
 *  quarter-note triplets (6/bar, 3 chords per bar). */
Max.addHandler("triplet", (v) => {
  const on = Number(v) !== 0;
  ticksPerBar = on ? 6 : 4;
  tripletOnsets = on ? [0, 2, 4] : null;
  player.dirty = true;
  if (player.engine === "phrase") reschedulePhrase();
  Max.post(`player: triplet ${on ? "on (6/bar)" : "off (4/bar)"}`);
});

/* --- Voicing engine dials --------------------------------------------- */
Max.addHandler("voicing", (v) => {
  const b = perf.voicingLevelBands(v);
  voicingOptions.triadsOnly = b.triadsOnly;
  voicingOptions.voiceLeadingEnabled = b.voiceLeading;
  voicingOptions.extensions = b.extensions;
  voicingOptions.drop2 = b.drop2;
  voicingOptions.spreadCap = b.spreadCap;
  previousVoicing = null; // voice count can change -> reset VL history
});
Max.addHandler("voicedistance", (v) => {
  const pos = perf.voiceDistancePosition(v);
  voicingOptions.voiceDistanceSteps = pos.steps;
  Max.outlet(["voicedistname", pos.name]);
});

/* --- Key composition from MPK key-set pads (root + mode) --------------- */
function sendKey() {
  const k = currentKey();
  voicingOptions.currentKey = k;
  // The phrase engine generates IN the key, so a key change must re-generate
  // and discard any phrase pre-fetched in the old one.
  if (player.engine === "phrase") invalidatePhrase();
  withEngine()
    .then((e) => e.setKey(k))
    .catch(() => {});
  Max.outlet(["keyname", k]);
}
Max.addHandler("keyroot", (v) => {
  player.keyRoot = ((Math.round(Number(v)) % 12) + 12) % 12;
  sendKey();
});
Max.addHandler("keymode", (m) => {
  player.keyMode = String(m).toLowerCase().indexOf("min") === 0 ? "min" : "maj";
  sendKey();
});

/* --- MPK Mini Plus MIDI: Program-Change pads + CC joystick ------------- */
Max.addHandler("pgm", (n) => {
  const a = perf.decodePgm(n);
  switch (a.action) {
    case "playtoggle":
      if (player.active) playerStop("stopped");
      else playerStart();
      break;
    case "reroll":
      playerReroll();
      break;
    case "holdtoggle":
      player.hold = !player.hold;
      Max.post(`player: hold ${player.hold ? "on" : "off"}`);
      break;
    case "modecycle":
      player.mode = perf.nextMode(player.mode);
      player.dirty = true;
      Max.outlet(["phrasemodename", player.mode]);
      break;
    case "length":
      player.lengthBars = a.arg;
      player.dirty = true;
      Max.outlet(["phraselenbars", a.arg]);
      break;
    case "keyroot":
      player.keyRoot = a.arg;
      sendKey();
      break;
    case "keymode":
      player.keyMode = a.arg;
      sendKey();
      break;
    default:
      break;
  }
});
Max.addHandler("cc", (num, val) => {
  const m = perf.ccToParam(num, val);
  if (m) forwardDial(m.param, m.value);
});

/** Manual panic: forget history and tell Max to stop sounding notes. */
Max.addHandler("panic", () => {
  previousVoicing = null;
  Max.outlet(["stop"]);
});

// Start loading the models immediately: `init` may not arrive until the patch's
// loadbang fires, and the first PLAY should not wait on a cold start.
withEngine().catch(() => {});

Max.post("onnx_markov_osc.js loaded — no Python required");
