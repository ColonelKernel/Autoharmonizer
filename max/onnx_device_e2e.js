/**
 * onnx_device_e2e.js — drive the REAL onnx_markov_osc.js headlessly and prove
 * the device needs no Python.
 *
 * Two claims are under test, and they fail for different reasons:
 *
 *  1. NOTHING LEAVES THE PROCESS. child_process and dgram are booby-trapped
 *     before the bridge is loaded, and `node-osc` is recorded if it is ever
 *     required. A regression that quietly reintroduces the supervisor or the
 *     OSC client trips these, not a subtle output diff.
 *  2. IT ACTUALLY GENERATES. All four engines (markov / rnn / lstm / phrase)
 *     must drive the clock and emit playable MIDI through the same
 *     chord_parser voicing the Python-backed device uses.
 *
 * Run:  node onnx_device_e2e.js      (exits non-zero on any failure)
 */
"use strict";
const path = require("path");
const Module = require("module");

const MAXDIR = __dirname;
const violations = [];

// --- booby-trap the Python-era escape hatches, BEFORE loading the bridge ----
// Patch the APIs rather than the requires: onnxruntime-node may legitimately
// pull in `child_process` transitively, but it must never CALL it.
const cp = require("child_process");
for (const fn of ["spawn", "fork", "exec", "execFile", "spawnSync", "execSync", "execFileSync"]) {
  cp[fn] = (...a) => {
    violations.push(`child_process.${fn}(${String(a[0]).slice(0, 40)})`);
    throw new Error(`forbidden: child_process.${fn}`);
  };
}
const dgram = require("dgram");
dgram.createSocket = (...a) => {
  violations.push(`dgram.createSocket(${JSON.stringify(a[0])})`);
  throw new Error("forbidden: dgram.createSocket");
};
const net = require("net");
const realConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...a) {
  violations.push("net.Socket.connect");
  return realConnect.apply(this, a);
};

// --- stub max-api; record (and refuse) any attempt to load node-osc --------
const outlets = [];
const handlers = {};
const posts = [];
const fakeMax = {
  addHandler: (n, f) => { handlers[n] = f; },
  outlet: (a) => { outlets.push(Array.isArray(a) ? a : [a]); },
  post: (m) => { posts.push(String(m)); },
};
const realResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "max-api") return "STUB_MAX_API";
  if (req === "node-osc" || req === "./backend_supervisor.js") {
    violations.push(`required ${req}`);
    throw new Error(`forbidden require: ${req}`);
  }
  return realResolve.call(this, req, ...rest);
};
require.cache["STUB_MAX_API"] = { id: "STUB_MAX_API", filename: "STUB_MAX_API", loaded: true, exports: fakeMax };

require(path.join(MAXDIR, "onnx_markov_osc.js"));

let fails = 0;
const check = (n, c, extra) => {
  console.log((c ? "PASS " : "FAIL ") + n + (c || extra === undefined ? "" : `  [${extra}]`));
  if (!c) fails++;
};

// --- helpers ---------------------------------------------------------------
/** Let every pending promise + setImmediate chain drain. */
const settle = async (n = 12) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
};
const sel = (s) => outlets.filter((o) => o[0] === s);
const lastOf = (s) => { const m = sel(s); return m.length ? m[m.length - 1] : null; };
const clear = () => { outlets.length = 0; };

// The bridge announces each generation on Max.post; counting them is how we can
// tell a genuine LOOP replay (zero new phrases) from a silent regeneration that
// happens to produce the same first chord.
const installs = () => posts.filter((p) => /^phrase: \d+ chords over/.test(p)).length;
const prefetches = () => posts.filter((p) => p.startsWith("phrase: pre-fetched")).length;

/** Run one transport tick; return the chords sonified during it. */
function tick() {
  const before = outlets.length;
  handlers.beat();
  return outlets.slice(before).filter((o) => o[0] === "chord").map((o) => o[1]);
}
/** Notes emitted during a tick. */
function tickNotes() {
  const before = outlets.length;
  handlers.beat();
  return outlets.slice(before).filter((o) => o[0] === "notes").map((o) => o.slice(1));
}

const MODEL_NAMES = ["markov", "rnn", "lstm"];

(async () => {
  // === 1. BOOT: the local engine comes up with no Python ====================
  await settle(40); // ONNX session creation is async

  const state = lastOf("backendstate");
  check("engine reports up", !!state && state[1] === "up", state && state[1]);
  const text = lastOf("backendtext");
  const kind = text ? text.slice(1).join(" ") : "";
  check("engine names its forward pass", kind === "onnx ready" || kind === "js fallback", kind);
  console.log(`     -> running the ${kind === "onnx ready" ? "ONNX" : "pure-JS"} backend`);
  check("status ready emitted", sel("status").some((o) => o[1] === "ready"));

  // === 2. WALK ENGINES: markov / rnn / lstm each produce MIDI ===============
  for (let idx = 0; idx < 3; idx++) {
    const name = MODEL_NAMES[idx];
    clear();
    handlers.modelidx(idx);
    await settle();
    const stat = lastOf("modelstat");
    check(`${name}: engine confirms the active model`, !!stat && stat[1] === name, stat && stat[1]);

    handlers.phrasemode(2); // oneshot, so the walk stops on its own
    handlers.seedsel(0); // C:maj
    clear();
    handlers.play(1);
    await settle();

    const notes = tickNotes(); // beat 0 is an onset for the default template
    check(`${name}: first beat emits playable MIDI`, notes.length === 1 && notes[0].length >= 3, JSON.stringify(notes));
    check(`${name}: notes are in MIDI range`,
      notes.length === 1 && notes[0].every((n) => Number.isInteger(n) && n >= 0 && n <= 127), JSON.stringify(notes[0]));

    // Walk four bars; the chain must keep answering.
    let sounded = 1;
    for (let t = 1; t < 16; t++) {
      await settle(4); // the model's reply for the next slot arrives between ticks
      if (tickNotes().length) sounded++;
    }
    check(`${name}: walks a full 4-bar cycle`, sounded >= 6, `${sounded} chords`);
    handlers.play(0);
    await settle();
  }

  // === 3. PHRASE ENGINE: whole-sequence generation, locally =================
  handlers.modelidx(3); // "phrase"
  handlers.lenidx(1); // 4 bars = 16 ticks
  handlers.phrasemode(0); // loop
  handlers.cadence(1.0);
  await settle();

  clear();
  handlers.play(1);
  check("phrase: clock is gated before the phrase lands", tick().length === 0);
  await settle();
  check("phrase: generated without any network call", violations.length === 0, violations.join("; "));

  const first = tick();
  check("phrase: first tick sounds the first chord", first.length === 1, JSON.stringify(first));
  const heard = [...first];
  for (let t = 1; t < 16; t++) { const c = tick(); if (c.length) heard.push(c[0]); }
  check("phrase: a 4-bar phrase sounds several chords", heard.length >= 3, heard.join(" "));
  check("phrase: resolves home on the last bar", heard[heard.length - 1] === "C:maj7" || heard[heard.length - 1] === "C:maj",
    heard[heard.length - 1]);

  // LOOP replays the installed schedule: no new phrase, and a full second pass
  // that matches the first chord for chord.
  const beforeLoop = installs();
  clear();
  const loop1 = tick(); // tick 16 -> wraps to 0
  check("loop: wraps and re-sounds the first chord", loop1[0] === heard[0], `${loop1[0]} vs ${heard[0]}`);
  const replay = [...loop1];
  for (let t = 1; t < 16; t++) { const c = tick(); if (c.length) replay.push(c[0]); }
  check("loop: replays the phrase exactly", JSON.stringify(replay) === JSON.stringify(heard),
    `${replay.join(" ")} vs ${heard.join(" ")}`);
  check("loop: generated no new phrase", installs() === beforeLoop, `${installs()} vs ${beforeLoop}`);

  // REROLL regenerates.
  const beforeReroll = installs();
  clear();
  handlers.reroll();
  check("reroll: gates the clock", tick().length === 0);
  await settle();
  check("reroll: generated a fresh phrase", installs() === beforeReroll + 1, `${installs()} vs ${beforeReroll + 1}`);
  const fresh = tick();
  check("reroll: resumes on the new phrase's first chord", fresh.length === 1, JSON.stringify(fresh));

  // REGEN pre-fetches one bar before the end, so the boundary never stalls.
  handlers.phrasemode(1);
  const beforePrefetch = prefetches();
  for (let t = 1; t < 13; t++) { tick(); await settle(2); } // -> beat 12 of 16
  check("regen: pre-fetches a bar before the boundary", prefetches() === beforePrefetch + 1,
    `${prefetches()} vs ${beforePrefetch + 1}`);
  for (let t = 13; t < 16; t++) { tick(); await settle(2); }
  clear();
  const wrap = tick(); // boundary: the pre-fetched phrase installs with no gap
  check("regen: boundary sounds a chord immediately (no stall)", wrap.length === 1, JSON.stringify(wrap));

  handlers.play(0);
  await settle();

  // === 4. HOLD / PANIC still behave =========================================
  check("stop emits playoff", sel("playoff").length >= 1);

  // === 4b. ASYNC-RACE REGRESSIONS (confirmed adversarial-review findings) ====
  // These are the bugs the generation counter fixes. Each opens the exact
  // in-flight window the review described, then supersedes it, and asserts the
  // stale reply is dropped. They pass vacuously unless sample()/generatePhrase()
  // are genuinely async — which they are on the ONNX backend (session.run).

  // Finding 1: a WALK reply that resolves after Stop must sound nothing.
  handlers.modelidx(1); // rnn -> sample() awaits a native session.run
  await settle();
  handlers.phrasemode(2); // oneshot
  handlers.seedsel(0);
  handlers.play(1); // playerStart -> submitChord(seed) now in flight
  handlers.play(0); // Stop BEFORE it resolves -> bumps genId, active=false
  const afterStop = outlets.length;
  await settle(30); // let the superseded reply resolve
  const notesAfterStop = outlets.slice(afterStop).filter((o) => o[0] === "notes");
  check("race: a walk reply resolving after Stop sounds nothing", notesAfterStop.length === 0, JSON.stringify(notesAfterStop));

  // Findings 2 & 3: a PHRASE generation that resolves after Stop must not
  // install, must not emit a chord, must not touch the display. On the pre-fix
  // code emit("/phrase/output") ran unconditionally and did all three.
  handlers.modelidx(3); // phrase
  handlers.lenidx(1);
  handlers.phrasemode(2); // oneshot
  await settle();
  const installsBefore = installs();
  handlers.play(1); // requestPhrase in flight
  handlers.play(0); // Stop before it resolves -> bumps genId
  const afterPhraseStop = outlets.length;
  await settle(30); // let the superseded generation resolve
  check("race: a phrase resolving after Stop does not install", installs() === installsBefore, `${installs() - installsBefore} installs`);
  const postStop = outlets.slice(afterPhraseStop);
  check("race: a phrase resolving after Stop emits no chord/notes",
    !postStop.some((o) => o[0] === "chord" || o[0] === "notes"), JSON.stringify(postStop.map((o) => o[0])));

  // Finding 6 shares finding 1's mechanism (the genId check in submitChord), so
  // it is covered by the walk-after-Stop case above; Reroll bumps the same
  // counter Stop does. Confirm a fresh Reroll still supersedes cleanly and plays.
  handlers.modelidx(3); handlers.phrasemode(0); await settle();
  handlers.play(1); await settle(30);
  handlers.reroll(); await settle(30);
  const afterReroll = tick();
  check("race: reroll after a settled phrase plays the new one", afterReroll.length === 1, JSON.stringify(afterReroll));
  handlers.play(0);
  await settle();

  // Findings 2 & 3: the wall-clock reply timeout is gone, so it can never fire a
  // spurious error or race the real reply into a seed-hold. Assert it never has.
  check("race: no 'reply timeout' error was ever emitted",
    !outlets.some((o) => o[0] === "error" && String(o[1]).includes("reply timeout")));

  // === 5. THE CENTRAL CLAIM =================================================
  check("no child process was spawned", !violations.some((v) => v.startsWith("child_process")));
  check("no UDP socket was opened", !violations.some((v) => v.startsWith("dgram")));
  check("no TCP connection was opened", !violations.some((v) => v.startsWith("net.")));
  check("node-osc was never required", !violations.some((v) => v.includes("node-osc")));
  check("backend_supervisor was never required", !violations.some((v) => v.includes("backend_supervisor")));
  check("zero forbidden operations overall", violations.length === 0, violations.join("; "));

  console.log(fails ? `\nONNX DEVICE E2E FAILURES: ${fails}` : "\nONNX DEVICE E2E ALL OK (no Python, no sockets, no subprocesses)");
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.error("HARNESS CRASH", err);
  process.exit(1);
});
