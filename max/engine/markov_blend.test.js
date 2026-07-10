"use strict";

/**
 * markov_blend.test.js — pins the JS corpus-blend port to Python.
 *
 * Run with:  node markov_blend.test.js
 * Exits non-zero if any assertion fails. No external test framework.
 *
 * Python's random.Random (MT19937) is not reproducible in JS and production runs
 * unseeded, so draws are NEVER compared. Instead:
 *   1. A Python-generated DISTRIBUTION fixture (fixtures/blend_fixture.json) is
 *      reproduced exactly by blendedChoices/colorWeights/temperature.
 *   2. counts->probs are hand-recomputed from the raw corpora JSON.
 *   3. names() excludes "all".
 *   4. The fallback ladder is exercised, including the load-bearing rule that a
 *      chord present in "all" but absent from the color-weighted corpora comes
 *      back with fallbackUsed=true and a REAL output (not an echo).
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { loadCorpora } = require("./corpus.js");
const blend = require("./blend.js");
const { createMarkovEngine } = require("./markov_engine.js");

const PROJECT = path.resolve(__dirname, "..", "..");
const CORPORA_PATH = path.join(PROJECT, "data", "markov_corpora_t.json");
const FIXTURE_PATH = path.join(__dirname, "fixtures", "blend_fixture.json");

let passed = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) passed++;
  else failures.push(name + (extra !== undefined ? "  -> " + extra : ""));
}

const rawJson = JSON.parse(fs.readFileSync(CORPORA_PATH, "utf8"));
const corpora = loadCorpora(CORPORA_PATH);
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));

/* --- 1. names() excludes "all" ------------------------------------------ */
const names = corpora.names();
check("names() excludes 'all'", names.indexOf("all") === -1, names.join(","));
check(
  "names() lists every non-'all' corpus",
  Object.keys(rawJson)
    .filter((n) => n !== "all")
    .every((n) => names.indexOf(n) !== -1) && names.length === Object.keys(rawJson).length - 1
);

/* --- 2. counts -> probs == hand recomputation from raw JSON -------------- */
{
  // pop909 / F:maj: prob of every target must equal count / sum(counts).
  const src = "F:maj";
  const rawTargets = rawJson.pop909[src];
  let total = 0;
  for (const k of Object.keys(rawTargets)) total += rawTargets[k];
  const dist = corpora.distBySource("pop909").get(src);
  const asMap = new Map(dist);
  let maxErr = 0;
  let orderOk = true;
  const rawKeys = Object.keys(rawTargets);
  for (let i = 0; i < rawKeys.length; i++) {
    const t = rawKeys[i];
    maxErr = Math.max(maxErr, Math.abs(asMap.get(t) - rawTargets[t] / total));
    if (dist[i][0] !== t) orderOk = false; // JSON target order preserved
  }
  check("counts->probs pop909/F:maj matches count/sum", maxErr < 1e-12, "maxErr=" + maxErr);
  check("counts->probs preserves JSON target order", orderOk);
  check("dist length == raw target count", dist.length === rawKeys.length);
  const probSum = dist.reduce((s, [, p]) => s + p, 0);
  check("per-source probs sum to 1", Math.abs(probSum - 1) < 1e-12, "sum=" + probSum);
}

/* --- 3. globalFallback = pooled counts, most-common first ---------------- */
{
  // Recompute pooled counts from the "all" corpus and hand-check the top entry.
  const poolCounts = new Map();
  for (const src of Object.keys(rawJson.all)) {
    const targets = rawJson.all[src];
    for (const t of Object.keys(targets)) poolCounts.set(t, (poolCounts.get(t) || 0) + targets[t]);
  }
  let total = 0;
  for (const v of poolCounts.values()) total += v;
  const expTop = [...poolCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const gf = corpora.globalFallback;
  check("globalFallback[0] is the most-common target", gf[0][0] === expTop[0], gf[0][0]);
  check(
    "globalFallback[0] prob == topCount/total",
    Math.abs(gf[0][1] - expTop[1] / total) < 1e-12
  );
  check(
    "globalFallback sorted descending by prob",
    gf.every((e, i) => i === 0 || gf[i - 1][1] >= e[1])
  );
}

/* --- 4. temperature() linear map ---------------------------------------- */
check("temperature(0) == 0.6", Math.abs(blend.temperature(0) - 0.6) < 1e-12);
check("temperature(1) == 1.8", Math.abs(blend.temperature(1) - 1.8) < 1e-12);
check("temperature(0.5) == 1.2", Math.abs(blend.temperature(0.5) - 1.2) < 1e-12);

/* --- 5. FIXTURE PARITY: JS reproduces Python within 1e-9 + same order ---- */
{
  let cwMaxErr = 0; // color_weights error
  let cwBad = 0;
  let tempMaxErr = 0;
  let probMaxErr = 0;
  let lenMismatch = 0;
  let orderMismatch = 0;
  let worst = "";

  for (const c of fixture.cases) {
    // color_weights
    const w = blend.colorWeights(c.color, names);
    const objKeys = Object.keys(c.color_weights);
    if (w.size !== objKeys.length) cwBad++;
    for (const k of objKeys) {
      if (!w.has(k)) cwBad++;
      else cwMaxErr = Math.max(cwMaxErr, Math.abs(w.get(k) - c.color_weights[k]));
    }

    // temperature
    const tau = blend.temperature(c.adventure);
    tempMaxErr = Math.max(tempMaxErr, Math.abs(tau - c.temperature));

    // blended_choices
    const got = blend.blendedChoices(corpora, w, tau, c.source, c.mode, c.gravity);
    const exp = c.choices;
    if (got.length !== exp.length) {
      lenMismatch++;
      worst = `len ${got.length}!=${exp.length} @ color=${c.color} adv=${c.adventure} grav=${c.gravity} key=${c.key} src=${c.source}`;
      continue;
    }
    for (let i = 0; i < exp.length; i++) {
      if (got[i][0] !== exp[i][0]) {
        orderMismatch++;
        worst = `order @${i} ${got[i][0]}!=${exp[i][0]} (color=${c.color} src=${c.source})`;
        break;
      }
      const e = Math.abs(got[i][1] - exp[i][1]);
      if (e > probMaxErr) {
        probMaxErr = e;
        if (e > 1e-9) worst = `prob ${e} @${i} src=${c.source}`;
      }
    }
  }

  check("fixture has 1080 cases", fixture.cases.length === 1080, fixture.cases.length);
  check("color_weights match Python (<1e-9)", cwBad === 0 && cwMaxErr < 1e-9, "bad=" + cwBad + " maxErr=" + cwMaxErr);
  check("temperature matches Python (<1e-9)", tempMaxErr < 1e-9, "maxErr=" + tempMaxErr);
  check("blendedChoices lengths match", lenMismatch === 0, worst);
  check("blendedChoices ordering matches", orderMismatch === 0, worst);
  check("blendedChoices probs match within 1e-9", probMaxErr < 1e-9, "maxErr=" + probMaxErr + " " + worst);
}

/* --- 6. applyTemperature / applyCadence sanity --------------------------- */
{
  const entries = [["C:maj", 0.5], ["A:min", 0.3], ["G:7", 0.2]];
  const hot = blend.applyTemperature(entries, 1.8);
  const cold = blend.applyTemperature(entries, 0.6);
  const sumHot = hot.reduce((s, [, p]) => s + p, 0);
  check("applyTemperature renormalizes to 1", Math.abs(sumHot - 1) < 1e-12);
  check("applyTemperature sorts descending", hot.every((e, i) => i === 0 || hot[i - 1][1] >= e[1]));
  // Lower tau sharpens: the top prob is higher than at high tau.
  check("lower tau sharpens the peak", cold[0][1] > hot[0][1]);
  // Cadence with gravity 0 is identity (same array reference/values).
  check("applyCadence gravity<=0 is identity", blend.applyCadence(hot, "maj", 0) === hot);
  // Cadence boosts the tonic (C:maj, pc 0) in maj mode.
  const grav = blend.applyCadence(hot, "maj", 1);
  const cIn = grav.find((e) => e[0] === "C:maj");
  const cWas = hot.find((e) => e[0] === "C:maj");
  check("applyCadence boosts tonic share", cIn[1] > cWas[1]);
}

/* --- 7. FALLBACK LADDER ------------------------------------------------- */
// A deterministic rng so the engine produces a stable pick (draws are not
// compared to Python; we only assert WHICH ladder rung fired).
function fixedRng() {
  return 0.0;
}

// Find a source present in pooled "all" but ABSENT from nottingham (the sole
// color-weighted corpus at color=0), to exercise the pooled-first rung.
const pooled = corpora.pooled();
let allNotNottingham = null;
for (const src of pooled.keys()) {
  if (!corpora.has("nottingham", src)) {
    allNotNottingham = src;
    break;
  }
}
check("found a source in 'all' but not in nottingham", allNotNottingham !== null, allNotNottingham);

{
  // (1) pooled-first: fires REGARDLESS of policy — use error_only to prove the
  //     pooled chain wins over the policy (a real output, not an error).
  const eng = createMarkovEngine({
    corpora,
    rng: fixedRng,
    fallback: "error_only",
    color: 0,
    adventure: 0.5,
    key: "C:maj",
    gravity: 0,
  });
  const r = eng.sample(allNotNottingham);
  check("pooled-first: fallbackUsed true", r.fallbackUsed === true);
  check("pooled-first: real output (not null)", r.output !== null && r.output.indexOf(":") !== -1, r.output);
  check("pooled-first: has candidates + probability", r.candidates > 0 && r.probability !== null);
  check("pooled-first: mix records '+all'", /\+all$/.test(r.mix), r.mix);
  check("pooled-first: error still reported", typeof r.error === "string" && r.error.indexOf("unknown chord") === 0);
  // Sanity: the chosen output is a genuine pooled target of the source.
  const poolTargets = new Set(pooled.get(allNotNottingham).map((e) => e[0]));
  check("pooled-first: output is a pooled target", poolTargets.has(r.output));
}

// A source absent from BOTH color corpora AND "all": an invalid root passes
// through transposition untouched and is in no corpus, so the POLICY rung fires.
const UNKNOWN = "Zz:maj";
check("UNKNOWN is absent from pooled 'all'", !pooled.has(UNKNOWN));

{
  const eng = createMarkovEngine({ corpora, rng: fixedRng, fallback: "echo_input", color: 0 });
  const r = eng.sample(UNKNOWN);
  check("echo_input: echoes the input chord", r.output === UNKNOWN);
  check("echo_input: fallbackUsed true, no probability", r.fallbackUsed === true && r.probability === null);
  check("echo_input: candidates 0", r.candidates === 0);
}
{
  const eng = createMarkovEngine({ corpora, rng: fixedRng, fallback: "error_only", color: 0 });
  const r = eng.sample(UNKNOWN);
  check("error_only: output null", r.output === null && r.fallbackUsed === true);
}
{
  const eng = createMarkovEngine({ corpora, rng: fixedRng, fallback: "global_top", color: 0 });
  const r = eng.sample(UNKNOWN);
  check("global_top: output is globalFallback[0]", r.output === corpora.globalFallback[0][0], r.output);
  check("global_top: no probability/candidates", r.probability === null && r.candidates === 0);
}
{
  const eng = createMarkovEngine({ corpora, rng: fixedRng, fallback: "random_source", color: 0 });
  const r = eng.sample(UNKNOWN);
  check("random_source: real output with candidates", r.output !== null && r.candidates > 0 && r.fallbackUsed === true);
}

/* --- 8. Engine setters + key transposition round-trip ------------------- */
{
  const eng = createMarkovEngine({ corpora, rng: fixedRng, fallback: "echo_input", color: 0, key: "C:maj" });
  // Empty input -> distinct empty-input error, not a fallback.
  const empty = eng.sample("   ");
  check("empty input -> empty chord error, no fallback", empty.error === "empty chord input" && empty.fallbackUsed === false && empty.candidates === 0);

  // setKey to A:min changes the normalized-space transposition. A:min offset is
  // 0 (A -> A), so an in-key sample of A:min normalizes to itself; switch to a
  // real transposing key and confirm the output stays a valid chord symbol.
  eng.setKey("Eb:maj");
  const r = eng.sample("Eb:maj"); // normalizes to C:maj, samples, transposes back to Eb space
  check("Eb key: output is a valid Root:quality", r.output !== null && /^[A-G][b#]?:/.test(r.output), r.output);
  check("Eb key: not a fallback (Eb:maj known)", r.fallbackUsed === false);

  // setSpice sets BOTH color and adventure — after setSpice(1) the color window
  // is the last anchor (openbook only) at c=1.
  eng.setColor(0);
  eng.setSpice(1);
  eng.setKey("C:maj");
  const w = blend.colorWeights(1, names);
  check("colorWeights(1) is the last anchor only (openbook)", w.size === 1 && w.has("openbook"), [...w.keys()].join(","));
}

/* ------------------------------------------------------------------------ */
const failed = failures.length;
console.log("");
if (failed > 0) {
  console.log("markov_blend: " + passed + " passed, " + failed + " failed");
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  x " + f);
  process.exit(1);
} else {
  console.log("markov_blend: " + passed + " tests passed");
  process.exit(0);
}
