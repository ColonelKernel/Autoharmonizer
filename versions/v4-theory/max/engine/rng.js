"use strict";

/**
 * rng.js — deterministic PRNG for reproducible chord generation.
 *
 * Max/M4L has no seedable RNG; Math.random() cannot be reseeded, so any feature
 * that must replay identically (e.g. "reroll gives the same phrase for seed N")
 * needs its own generator. mulberry32 is a tiny, well-distributed 32-bit PRNG
 * that is trivial to reproduce bit-for-bit in JS, which is why it is chosen over
 * a linear-congruential toy: identical seed -> identical stream on every host.
 *
 * A null/undefined seed intentionally falls back to Math.random so callers that
 * want genuine nondeterminism (live performance) get it without a branch.
 */

// mulberry32: one 32-bit state word, returns a float in [0,1). The >>> 0 keeps
// arithmetic in unsigned 32-bit space (JS bit-ops are signed 32-bit otherwise),
// and dividing by 2^32 maps the full 32-bit output into [0,1).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * makeRng(seed) -> () => float in [0,1).
 * Number seed -> deterministic mulberry32; null/undefined -> Math.random.
 */
function makeRng(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return mulberry32(seed);
  }
  return Math.random;
}

module.exports = { makeRng };
