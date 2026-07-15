"use strict";

/**
 * local_engine.test.js — the facade that replaces the Python OSC service.
 *
 * The E2E harness proves the device generates; this pins the semantics it
 * INHERITED from python/src/engines/registry.py, which the E2E cannot see:
 *   * the Adventure/Spice dial -> softmax temperature map,
 *   * the effective-session table (markov is always stateless),
 *   * model switching resetting the neural context,
 *   * the argument validation osc_service.py did on /phrase/request.
 * These drift silently: a wrong temperature still produces chords.
 *
 * Run:  node engine/local_engine.test.js
 */

const assert = require("assert");
const { createLocalEngine, dialToTemperature } = require("./local_engine.js");

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); passed++; };

(async () => {
  // --- Adventure/Spice dial -> temperature (registry.set_neural_temperature_from_dial)
  // 0 -> ADVENTURE_TAU_MIN (0.6), 0.5 -> the neutral default (1.5), 1 -> 2.4.
  ok(Math.abs(dialToTemperature(0) - 0.6) < 1e-9, "dial 0 -> 0.6");
  ok(Math.abs(dialToTemperature(0.5) - 1.5) < 1e-9, "dial 0.5 -> 1.5 (the default)");
  ok(Math.abs(dialToTemperature(1) - 2.4) < 1e-9, "dial 1 -> 2.4");
  ok(Math.abs(dialToTemperature(-3) - 0.6) < 1e-9, "clamps below 0");
  ok(Math.abs(dialToTemperature(9) - 2.4) < 1e-9, "clamps above 1");
  ok(Math.abs(dialToTemperature("nonsense") - 1.5) < 1e-9, "non-numeric -> default");

  const eng = createLocalEngine({});
  const boot = await eng.init();
  ok(boot.ok, "engine boots");
  eq(eng.state(), "up", "state is up");
  ok(eng.kind() === "onnx" || eng.kind() === "js", `backend kind is ${eng.kind()}`);
  ok(eng.hasPhrase(), "phrase model loaded");

  // --- effective-session table --------------------------------------------
  eq(eng.activeModel(), "markov", "defaults to markov");
  eq(eng.sessionStatus(), ["stateless", 0], "markov is always stateless");

  // markov sampling must not advance any neural session
  await eng.sample("C:maj");
  eq(eng.sessionStatus(), ["stateless", 0], "markov sampling leaves the session at 0");

  ok(eng.setModel("rnn").ok, "switch to rnn");
  eq(eng.sessionStatus(), ["session", 0], "rnn under 'auto' is stateful, freshly reset");
  await eng.sample("C:maj");
  await eng.sample("F:maj");
  eq(eng.sessionStatus(), ["session", 2], "each successful sample advances the session");

  // stateless mode hides the step count and clears the carried state
  ok(eng.setSessionMode("stateless").ok, "set stateless");
  eq(eng.sessionStatus(), ["stateless", 0], "stateless reports 0 steps");
  await eng.sample("C:maj");
  eq(eng.sessionStatus(), ["stateless", 0], "stateless never accumulates");

  ok(eng.setSessionMode("session").ok, "set session");
  await eng.sample("C:maj");
  eq(eng.sessionStatus(), ["session", 1], "session accumulates again");

  // switching model resets the context (registry.set_model -> reset_session)
  ok(eng.setModel("lstm").ok, "switch to lstm");
  eq(eng.sessionStatus(), ["session", 0], "model switch resets the session");

  // explicit reset verb
  await eng.sample("C:maj");
  ok(eng.setSessionMode("reset").ok, "'reset' is accepted as a mode verb");
  eq(eng.sessionStatus(), ["session", 0], "reset zeroes the step count");
  eq(eng.setSessionMode("bogus").ok, false, "invalid session mode rejected");
  eq(eng.activeModel(), "lstm", "an invalid session mode does not change the model");

  // --- model validation ----------------------------------------------------
  eq(eng.setModel("bogus").ok, false, "invalid model rejected");
  eq(eng.activeModel(), "lstm", "a rejected model switch leaves the active model alone");

  // --- sampling contract ---------------------------------------------------
  const empty = await eng.sample("   ");
  eq(empty.output, null, "blank input -> null output");
  eq(empty.error, "empty chord input", "blank input -> the osc_service error string");

  eng.setModel("markov");
  const unknown = await eng.sample("Zz:wat");
  ok(unknown.fallbackUsed === true, "an unresolvable chord uses the fallback");
  eq(unknown.output, "Zz:wat", "echo_input is the default fallback policy");

  // --- /phrase/request argument validation ---------------------------------
  const plan = eng.generatePhrase({ key: "C:maj", bars: 4, cadence: 1.0 });
  eq(plan.reduce((a, [, d]) => a + d, 0), 16, "durations sum to bars*4");
  ok(plan.every(([s, d]) => typeof s === "string" && Number.isInteger(d) && d > 0), "plan is [symbol, beats] pairs");
  for (let i = 1; i < plan.length; i++) {
    ok(plan[i][0] !== plan[i - 1][0], "no adjacent duplicate chord symbols");
  }
  assert.throws(() => eng.generatePhrase({ bars: 0 }), /bars out of range/, "bars=0 rejected");
  assert.throws(() => eng.generatePhrase({ bars: 65 }), /bars out of range/, "bars=65 rejected");
  assert.throws(() => eng.generatePhrase({ bars: "x" }), /bars out of range/, "non-numeric bars rejected");
  passed += 3;

  // a seeded phrase is reproducible; an unseeded one is not pinned
  const a = eng.generatePhrase({ key: "C:maj", bars: 4, cadence: 1, seed: 42 });
  const b = eng.generatePhrase({ key: "C:maj", bars: 4, cadence: 1, seed: 42 });
  eq(a, b, "same seed -> identical phrase");

  // --- key + dials round-trip ---------------------------------------------
  eng.setKey("A:min");
  eq(eng.currentKey(), "A:min", "key is stored");
  eng.setKey("");
  eq(eng.currentKey(), "C:maj", "a blank key falls back to C:maj");
  eng.setSpice(1.0);
  eng.setColor(0.2);
  eng.setAdventure(0.9);
  eng.setGravity(0.5);
  passed += 1; // dials must not throw

  // --- reload re-reads the JSON assets ------------------------------------
  const r = eng.reload();
  ok(r.ok, "reload succeeds");
  const after = await eng.sample("C:maj");
  ok(after.output !== null || after.error, "engine still answers after reload");

  console.log("local_engine: " + passed + " tests passed");
})().catch((err) => {
  console.error("local_engine FAILED:", err.message);
  console.error(err.stack);
  process.exit(1);
});
