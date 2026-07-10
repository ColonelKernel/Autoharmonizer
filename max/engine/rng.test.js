"use strict";

/**
 * rng.test.js — makeRng determinism and range guarantees.
 * Run with:  node rng.test.js
 */

const assert = require("assert");
const { makeRng } = require("./rng.js");

let passed = 0;

// Same seed -> identical stream (reproducible reroll).
const a = makeRng(42);
const b = makeRng(42);
const seqA = [];
const seqB = [];
for (let i = 0; i < 1000; i++) {
  const va = a();
  const vb = b();
  seqA.push(va);
  seqB.push(vb);
  assert.ok(va >= 0 && va < 1, `value ${va} in [0,1)`);
}
assert.deepStrictEqual(seqA, seqB, "same seed -> identical sequence");
passed += 2;

// Different seeds -> different streams (not degenerate).
const c = makeRng(7);
assert.notStrictEqual(seqA[0], c(), "different seeds differ");
passed++;

// A fresh seeded rng repeats the same first value across constructions.
assert.strictEqual(makeRng(42)(), seqA[0], "seed replays first value");
passed++;

// Null/undefined -> Math.random fallback: successive calls (almost surely) differ.
const r = makeRng(null);
const vals = new Set();
for (let i = 0; i < 100; i++) {
  const v = r();
  assert.ok(v >= 0 && v < 1, `fallback value ${v} in [0,1)`);
  vals.add(v);
}
assert.ok(vals.size > 90, "Math.random fallback varies across calls");
assert.strictEqual(typeof makeRng(undefined), "function", "undefined seed -> function");
passed += 2;

console.log("rng: " + passed + " tests passed");
