/**
 * backend_supervisor.test.js — unit tests for the pure decision helpers.
 * Run under plain node:  node backend_supervisor.test.js
 * (The engine itself is exercised end-to-end by backend_supervisor.e2e.js,
 * which spawns the real Python backend.)
 */

"use strict";

const assert = require("assert");
const path = require("path");
const sup = require("./backend_supervisor.js");

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

/* --- interpretProbe: exit-code contract 0=full / 3=osc / else bad -------- */
test("interpretProbe full", () => assert.strictEqual(sup.interpretProbe(0), "full"));
test("interpretProbe osc-only", () => assert.strictEqual(sup.interpretProbe(3), "osc"));
test("interpretProbe import failure", () => assert.strictEqual(sup.interpretProbe(1), "bad"));
test("interpretProbe timeout/null", () => assert.strictEqual(sup.interpretProbe(null), "bad"));
test("interpretProbe signal-killed", () => assert.strictEqual(sup.interpretProbe(undefined), "bad"));

/* --- isReadyLine: the definitive stderr readiness marker ------------------ */
test("ready line matches the real log format", () => {
  assert.ok(sup.isReadyLine("2026-07-10 10:40:49,383 INFO src.osc_service: sent /status/ready"));
});
test("ready line tolerates trailing whitespace", () => {
  assert.ok(sup.isReadyLine("INFO src.osc_service: sent /status/ready \r"));
});
test("listening line is NOT readiness (fires before serve_forever)", () => {
  assert.ok(!sup.isReadyLine("INFO src.osc_service: OSC server listening on 127.0.0.1:9000"));
});
test("a chord echo mentioning ready is not readiness", () => {
  assert.ok(!sup.isReadyLine("sent /status/ready then more text"));
});

/* --- isPortCollision: Errno 48 means adopt, never restart ----------------- */
test("port collision detected from the real error line", () => {
  assert.ok(sup.isPortCollision("2026-07-10 ERROR __main__: server error: [Errno 48] Address already in use"));
});
test("ordinary crash output is not a collision", () => {
  assert.ok(!sup.isPortCollision("Traceback (most recent call last):\nValueError: boom"));
});

/* --- restartDelayMs: 1s, 2s, 4s backoff ----------------------------------- */
test("backoff sequence", () => {
  assert.strictEqual(sup.restartDelayMs(1), 1000);
  assert.strictEqual(sup.restartDelayMs(2), 2000);
  assert.strictEqual(sup.restartDelayMs(3), 4000);
});
test("backoff clamps nonsense to attempt 1", () => {
  assert.strictEqual(sup.restartDelayMs(0), 1000);
  assert.strictEqual(sup.restartDelayMs(NaN), 1000);
});

/* --- ranStably: attempt-counter reset only after sustained uptime ---------- */
test("30s of uptime resets the crash budget", () => {
  assert.ok(sup.ranStably(1000, 1000 + sup.STABLE_UP_MS));
});
test("a quick crash does not reset the budget", () => {
  assert.ok(!sup.ranStably(1000, 1000 + sup.STABLE_UP_MS - 1));
});
test("never-up does not reset", () => {
  assert.ok(!sup.ranStably(null, 999999));
});

/* --- buildCandidates: order and overrides ---------------------------------- */
test("candidate order: config, env, venvs, anaconda first among system", () => {
  const c = sup.buildCandidates({ CHORD_PYTHON: "/env/py" }, "/root", "/cfg/py");
  assert.strictEqual(c[0], "/cfg/py");
  assert.strictEqual(c[1], "/env/py");
  assert.strictEqual(c[2], path.join("/root", "python", ".venv", "bin", "python"));
  assert.strictEqual(c[3], path.join("/root", ".venv", "bin", "python"));
  assert.strictEqual(c[4], "/opt/anaconda3/bin/python3");
  assert.ok(c.indexOf("/usr/bin/python3") > c.indexOf("/opt/anaconda3/bin/python3"));
});
test("candidates deduplicate", () => {
  const c = sup.buildCandidates({ CHORD_PYTHON: "/opt/anaconda3/bin/python3" }, null, null);
  assert.strictEqual(c.filter((x) => x === "/opt/anaconda3/bin/python3").length, 1);
});
test("no root, no overrides still yields system candidates", () => {
  const c = sup.buildCandidates({}, null, null);
  assert.strictEqual(c[0], "/opt/anaconda3/bin/python3");
});

/* --- resolveRoot: walk-up + CHORD_PY_DIR override --------------------------- */
test("resolveRoot finds the repo root from max/", () => {
  const exists = (p) => p === path.join("/repo", "python", "src", "main.py");
  assert.strictEqual(sup.resolveRoot("/repo/max", {}, exists), "/repo");
});
test("resolveRoot finds the root when already at it", () => {
  const exists = (p) => p === path.join("/repo", "python", "src", "main.py");
  assert.strictEqual(sup.resolveRoot("/repo", {}, exists), "/repo");
});
test("resolveRoot gives up cleanly when absent", () => {
  assert.strictEqual(sup.resolveRoot("/nowhere/at/all", {}, () => false), null);
});
test("CHORD_PY_DIR override wins and is validated", () => {
  const exists = (p) => p === path.join("/elsewhere/python", "src", "main.py");
  assert.strictEqual(
    sup.resolveRoot("/repo/max", { CHORD_PY_DIR: "/elsewhere/python" }, exists),
    "/elsewhere"
  );
  assert.strictEqual(sup.resolveRoot("/repo/max", { CHORD_PY_DIR: "/bad/python" }, () => false), null);
});

/* --- stateLight: panel light mapping ---------------------------------------- */
test("both up states show green", () => {
  assert.strictEqual(sup.stateLight("up_managed"), "up");
  assert.strictEqual(sup.stateLight("up_external"), "up");
});
test("probing/starting show amber", () => {
  assert.strictEqual(sup.stateLight("probing"), "starting");
  assert.strictEqual(sup.stateLight("starting"), "starting");
});
test("everything else shows red", () => {
  assert.strictEqual(sup.stateLight("down"), "down");
  assert.strictEqual(sup.stateLight("idle"), "down");
});

/* --- PROBE_SRC sanity: fast probe, correct exit-code contract --------------- */
test("probe source imports pythonosc and find_specs torch (never imports it)", () => {
  assert.ok(sup.PROBE_SRC.includes("pythonosc.udp_client"));
  assert.ok(sup.PROBE_SRC.includes("find_spec('torch')"));
  assert.ok(!/import torch/.test(sup.PROBE_SRC));
});

console.log(`backend_supervisor.test.js: ${passed} tests passed${process.exitCode ? " (WITH FAILURES)" : ""}`);
