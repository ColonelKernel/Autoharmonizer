"use strict";

/**
 * ngram_engine.test.js — parity checks for the JS NgramEngine port against
 * golden I/O dumped from the REAL v4 module (fixtures/gen_ngram_fixtures.py).
 *
 * Python's random.Random cannot be reproduced in JS, so RNG-driven draws are
 * never compared directly. Instead we assert:
 *   (a) _lookup backoff — exact counts list returned for crafted histories;
 *   (b) _distribution — probabilities match Python to 1e-9 across temperatures;
 *   (c) the full sample flow under a DETERMINISTIC argmax candidate_selector;
 *   (d) malformed models (version 999, orders-as-list) are rejected;
 *   (e) the real model loads and sample('C:maj') yields a real chord.
 *
 * Run with:  node ngram_engine.test.js
 */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  createNgramEngine,
  NgramModelError,
  appendHistory,
  lookupCounts,
  distribution,
} = require("./ngram_engine.js");
const { parseChord } = require("./theory.js");

let passed = 0;
const FX = path.join(__dirname, "fixtures");
function fx(name) {
  return JSON.parse(fs.readFileSync(path.join(FX, name), "utf8"));
}

// The real model actually lives under versions/v4-theory/data (not data/).
const MODEL_PATH = path.join(__dirname, "..", "..", "versions", "v4-theory", "data", "theory_ngram.json");
const rawModel = JSON.parse(fs.readFileSync(MODEL_PATH, "utf8"));
const ORDERS = rawModel.orders;
const GLOBAL = rawModel.global;
const MAX_ORDER = Math.max(1, Math.trunc(Number(rawModel.max_order === undefined ? 4 : rawModel.max_order)));

// Sanity: confirm no RLE decode is needed — entries are plain [chord, count].
(function confirmNoRle() {
  const sample = GLOBAL[0];
  assert.ok(Array.isArray(sample) && sample.length === 2, "global entry is [chord,count]");
  assert.strictEqual(typeof sample[0], "string", "global chord is a string");
  assert.strictEqual(typeof sample[1], "number", "global count is a number");
  passed++;
})();

// ---- (a) _lookup backoff ---------------------------------------------------
for (const c of fx("ngram_lookup.json")) {
  const got = lookupCounts(ORDERS, GLOBAL, c.history, MAX_ORDER);
  assert.deepStrictEqual(
    got,
    c.counts,
    `lookup backoff for history ${JSON.stringify(c.history)}`
  );
  passed++;
}

// ---- (b) _distribution across temperatures ---------------------------------
for (const c of fx("ngram_distribution.json")) {
  const got = distribution(c.counts, c.temperature);
  assert.strictEqual(got.length, c.dist.length,
    `distribution length @tau=${c.temperature}`);
  for (let i = 0; i < got.length; i++) {
    assert.strictEqual(got[i][0], c.dist[i][0],
      `distribution symbol[${i}] @tau=${c.temperature}`);
    assert.ok(Math.abs(got[i][1] - c.dist[i][1]) < 1e-9,
      `distribution prob[${i}] @tau=${c.temperature}: js=${got[i][1]} py=${c.dist[i][1]}`);
  }
  passed++;
}

// ---- _append (dedup consecutive + trim to max_order) -----------------------
for (const c of fx("ngram_append.json")) {
  let h = [];
  for (const ch of c.seq) {
    h = appendHistory(h, ch, c.max_order);
  }
  assert.deepStrictEqual(h, c.history, `append for seq ${JSON.stringify(c.seq)}`);
  passed++;
}

// ---- (c) full sample flow under a deterministic argmax selector ------------
function argmaxSelector(source, choices /*, name */) {
  let best = choices[0];
  for (let i = 1; i < choices.length; i++) {
    if (choices[i][1] > best[1]) {
      best = choices[i];
    }
  }
  return best;
}

for (const c of fx("ngram_sample.json")) {
  const eng = createNgramEngine({ modelPath: MODEL_PATH, fallback: "echo_input", rng: 1 });
  for (let i = 0; i < c.inputs.length; i++) {
    const r = eng.sample(c.inputs[i], { session: true, candidateSelector: argmaxSelector });
    const exp = c.results[i];
    assert.strictEqual(r.output, exp.output, `sample output for ${JSON.stringify(c.inputs[i])}`);
    assert.strictEqual(r.candidates, exp.candidates, `sample candidates for ${JSON.stringify(c.inputs[i])}`);
    assert.strictEqual(r.fallbackUsed, exp.fallback_used, `sample fallbackUsed for ${JSON.stringify(c.inputs[i])}`);
    assert.strictEqual(r.error, exp.error, `sample error for ${JSON.stringify(c.inputs[i])}`);
    if (exp.probability === null) {
      assert.strictEqual(r.probability, null, `sample probability null for ${JSON.stringify(c.inputs[i])}`);
    } else {
      assert.ok(Math.abs(r.probability - exp.probability) < 1e-9,
        `sample probability for ${JSON.stringify(c.inputs[i])}: js=${r.probability} py=${exp.probability}`);
    }
  }
  assert.deepStrictEqual(eng.history, c.history, `final history for ${JSON.stringify(c.inputs)}`);
  passed++;
}

// ---- (d) malformed models rejected exactly like Python ---------------------
function writeTmp(obj) {
  const p = path.join(os.tmpdir(), `ngram_bad_${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(p, typeof obj === "string" ? obj : JSON.stringify(obj));
  return p;
}

{
  // version 999
  const p = writeTmp({ version: 999, orders: {}, global: [["C:maj", 1]] });
  assert.throws(() => createNgramEngine({ modelPath: p }), NgramModelError, "version 999 rejected");
  fs.unlinkSync(p);
  passed++;
}
{
  // orders as a list
  const p = writeTmp({ version: 1, orders: [], global: [["C:maj", 1]] });
  assert.throws(() => createNgramEngine({ modelPath: p }), NgramModelError, "orders-as-list rejected");
  fs.unlinkSync(p);
  passed++;
}
{
  // missing / empty global
  const p = writeTmp({ version: 1, orders: { "1": {} }, global: [] });
  assert.throws(() => createNgramEngine({ modelPath: p }), NgramModelError, "empty global rejected");
  fs.unlinkSync(p);
  passed++;
}
{
  // missing version entirely (Python: model.get('version') != 1)
  const p = writeTmp({ orders: { "1": {} }, global: [["C:maj", 1]] });
  assert.throws(() => createNgramEngine({ modelPath: p }), NgramModelError, "missing version rejected");
  fs.unlinkSync(p);
  passed++;
}
{
  // unreadable path -> NgramModelError
  assert.throws(
    () => createNgramEngine({ modelPath: path.join(os.tmpdir(), "does_not_exist_ngram.json") }),
    NgramModelError,
    "missing file rejected"
  );
  passed++;
}

// ---- (e) real model: sample('C:maj') returns a real chord ------------------
{
  const cand = fx("ngram_cmaj_candidates.json");
  // Every dumped candidate is a real, parseable chord.
  for (const ch of cand.choices) {
    assert.ok(parseChord(ch[0]) !== null, `candidate ${ch[0]} is a real chord`);
  }
  const eng = createNgramEngine({ modelPath: MODEL_PATH, rng: 12345 });
  const r = eng.sample("C:maj");
  assert.strictEqual(r.fallbackUsed, false, "C:maj is not a fallback");
  assert.strictEqual(r.error, null, "C:maj has no error");
  assert.strictEqual(r.candidates, cand.candidates, "C:maj candidate count matches Python");
  assert.ok(parseChord(r.output) !== null, `C:maj sampled output ${r.output} is a real chord`);
  const symbols = new Set(cand.choices.map((c) => c[0]));
  assert.ok(symbols.has(r.output), `C:maj output ${r.output} is one of the model candidates`);
  assert.ok(r.probability > 0 && r.probability <= 1, "C:maj probability in (0,1]");
  assert.deepStrictEqual(eng.history, ["C:maj", r.output], "history holds source + output");
  passed += 7;
}

// ---- API surface -----------------------------------------------------------
{
  const eng = createNgramEngine({ modelPath: MODEL_PATH, rng: 1 });
  assert.strictEqual(typeof eng.sample, "function", "sample exported");
  assert.strictEqual(typeof eng.resetSession, "function", "resetSession exported");
  assert.strictEqual(typeof eng.setTemperature, "function", "setTemperature exported");
  assert.ok(Array.isArray(eng.history), "history is an array");
  eng.sample("C:maj");
  assert.ok(eng.history.length > 0, "history populated after sample");
  eng.resetSession();
  assert.strictEqual(eng.history.length, 0, "resetSession clears history");
  passed += 4;
}

console.log("ngram_engine: " + passed + " tests passed");
