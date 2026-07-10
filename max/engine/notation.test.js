"use strict";

/**
 * notation.test.js — flat-marker bridge round-trips and passthroughs.
 * Run with:  node notation.test.js
 */

const assert = require("assert");
const { toJazznet, fromJazznet } = require("./notation.js");

let passed = 0;

// Colon case: only the ROOT flat marker flips; quality untouched.
assert.strictEqual(toJazznet("Bb:maj7"), "B-:maj7", "Bb -> B- (root only)");
assert.strictEqual(fromJazznet("B-:maj7"), "Bb:maj7", "B- -> Bb (root only)");
assert.strictEqual(toJazznet("Db:7"), "D-:7", "Db -> D-");
assert.strictEqual(fromJazznet("D-:7"), "Db:7", "D- -> Db");
assert.strictEqual(toJazznet("F#:min7"), "F#:min7", "sharp unchanged");
assert.strictEqual(toJazznet("C:maj"), "C:maj", "natural unchanged");
passed += 6;

// Round-trip is exact for the colon form across all canonical flats/sharps.
for (const c of ["Bb:maj7", "Db:min", "Eb:7", "Ab:dim7", "F#:hdim7", "C:maj", "G:min7"]) {
  assert.strictEqual(fromJazznet(toJazznet(c)), c, `round-trip ${c}`);
}
passed++;

// No-colon / non-chord tokens mirror the Python whole-string replace.
assert.strictEqual(toJazznet(""), "", "empty passes through");
assert.strictEqual(fromJazznet(""), "", "empty passes through");
assert.strictEqual(toJazznet("Bb"), "B-", "bare flat root flips");
assert.strictEqual(fromJazznet("B-"), "Bb", "bare dash root flips");
assert.strictEqual(toJazznet("N"), "N", "N passes through");
assert.strictEqual(fromJazznet("N"), "N", "N passes through");
passed += 6;

console.log("notation: " + passed + " tests passed");
