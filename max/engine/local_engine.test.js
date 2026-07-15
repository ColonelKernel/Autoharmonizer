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
const { makeRng } = require("./rng.js");

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

  // Seed the shared rng so the whole suite is deterministic — the assertion
  // count is then stable (phrase length no longer wanders) and the complexity
  // mean-tier checks below don't depend on luck.
  const eng = createLocalEngine({ rng: makeRng(20240714) });
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

  // --- v4: the n-gram model is a fourth Model -----------------------------
  eng.setKey("C:maj");
  ok(eng.setModel("ngram").ok, "ngram is a selectable model");
  eq(eng.activeModel(), "ngram", "ngram becomes active");
  eq(eng.sessionStatus()[0], "session", "ngram is stateful under auto");
  const ng1 = await eng.sample("C:maj");
  ok(ng1.output && ng1.output.indexOf(":") !== -1, `ngram produces a chord (${ng1.output})`);
  ok(eng.sessionStatus()[1] >= 1, "ngram session depth advances with history");
  eng.resetSession();
  eq(eng.sessionStatus()[1], 0, "resetSession clears the ngram history");

  // --- v4: Complexity reshapes the surface across models ------------------
  // Tier 0 (complexity 0) is diatonic triads; tier 4 (complexity 1) admits
  // extensions/alterations. Assert the tier of the realized chord tracks the
  // dial over a fixed-seed batch (per-sample can vary; the mean must move).
  const { chordComplexityTier } = require("./theory.js");
  const tierMean = async (cx, model) => {
    eng.setModel(model);
    eng.setComplexity(cx);
    eng.setKey("C:maj");
    let sum = 0;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const s = await eng.sample("C:maj");
      sum += s.output ? chordComplexityTier(s.output, "C:maj") : 0;
    }
    return sum / N;
  };
  for (const model of ["markov", "ngram"]) {
    const lo = await tierMean(0.0, model);
    const hi = await tierMean(1.0, model);
    ok(hi > lo, `${model}: mean complexity rises with the dial (${lo.toFixed(2)} -> ${hi.toFixed(2)})`);
  }
  // Complexity 0 must never emit above tier 1 (diatonic triads/sevenths only).
  eng.setModel("markov");
  eng.setComplexity(0.0);
  let allLow = true;
  for (let i = 0; i < 40; i++) {
    const s = await eng.sample("C:maj");
    if (s.output && chordComplexityTier(s.output, "C:maj") > 1) allLow = false;
  }
  ok(allLow, "complexity 0 stays at diatonic tiers (<=1)");

  eng.setComplexity(0.5);
  eq(eng.complexity(), 0.5, "complexity is stored/readable");

  // v4 parity quirk: registry.py realizes the NEURAL branch's output even on a
  // fallback (it guards only `output is not None`), while markov/ngram realize
  // only real selections. So a neural fallback is re-voiced to the tier; a
  // markov fallback is echoed raw. C#:hdim7 reduces to Db:hdim7, absent from the
  // JazzNet vocab, so it deterministically hits the neural fallback.
  {
    const rnnEng = createLocalEngine({ rng: makeRng(1) });
    await rnnEng.init();
    rnnEng.setKey("C:maj");
    for (const [cx, hint] of [[0.0, "diatonic"], [0.75, "extended"]]) {
      rnnEng.setModel("rnn");
      rnnEng.setComplexity(cx);
      const r = await rnnEng.sample("C#:hdim7");
      ok(r.fallbackUsed === true, `neural fallback fires for an out-of-vocab chord (cx=${cx})`);
      ok(r.output !== "C#:hdim7" && r.output !== "Db:hdim7",
        `neural fallback IS realized (${hint}) to ${r.output}, not echoed raw`);
      ok(chordComplexityTier(r.output, "C:maj") <= (cx === 0 ? 1 : 4),
        `realized neural fallback sits in the tier band (${r.output})`);
    }
    rnnEng.setModel("markov");
    rnnEng.setComplexity(0.0);
    const m = await rnnEng.sample("Zz:wat");
    ok(m.fallbackUsed === true && m.output === "Zz:wat", "markov fallback is echoed raw, NOT realized");
  }

  console.log("local_engine: " + passed + " tests passed");
})().catch((err) => {
  console.error("local_engine FAILED:", err.message);
  console.error(err.stack);
  process.exit(1);
});
