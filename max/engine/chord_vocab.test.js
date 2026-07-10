"use strict";

/**
 * chord_vocab.test.js — cross-checks the JS port against Python reference
 * output dumped by scratchpad/gen_fixtures.py. A silent divergence in key
 * transposition corrupts every downstream engine, so we assert EXACT equality
 * over a wide input grid rather than spot cases.
 *
 * Run with:  node chord_vocab.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const V = require("./chord_vocab.js");

let passed = 0;
const FX = path.join(__dirname, "fixtures");
function fx(name) {
  return JSON.parse(fs.readFileSync(path.join(FX, name), "utf8"));
}

// transpose_chord over the full grid (roots x qualities x offsets + non-chords).
for (const c of fx("transpose_chord.json")) {
  assert.strictEqual(
    V.transposeChord(c.symbol, c.offset),
    c.out,
    `transposeChord(${JSON.stringify(c.symbol)}, ${c.offset})`
  );
  passed++;
}

// parse_key -> {tonicPc, mode}, plus keyOffset and transposeOffset derived.
for (const c of fx("parse_key.json")) {
  const pk = V.parseKey(c.key);
  const expectPc = c.tonicPc === null ? null : c.tonicPc;
  assert.strictEqual(pk.tonicPc, expectPc, `parseKey(${JSON.stringify(c.key)}).tonicPc`);
  assert.strictEqual(pk.mode, c.mode, `parseKey(${JSON.stringify(c.key)}).mode`);
  assert.strictEqual(V.keyOffset(c.key), c.keyOffset, `keyOffset(${JSON.stringify(c.key)})`);
  const to = V.transposeOffset(pk.tonicPc, pk.mode);
  assert.strictEqual(to === undefined ? null : to, c.transposeOffset,
    `transposeOffset via key ${JSON.stringify(c.key)}`);
  passed++;
}

// transpose_offset directly over all pitch classes + None.
for (const c of fx("transpose_offset.json")) {
  const got = V.transposeOffset(c.tonicPc, c.mode);
  assert.strictEqual(got === undefined ? null : got, c.out,
    `transposeOffset(${c.tonicPc}, ${c.mode})`);
  passed++;
}

// Targeted invariants beyond the fixture (document the guarantees).
assert.strictEqual(V.keyOffset(""), 0, "blank key -> identity offset");
assert.strictEqual(V.keyOffset("junk"), 0, "unknown key -> identity offset");
assert.strictEqual(V.transposeChord("N", 5), "N", "N passes through");
assert.strictEqual(V.transposeChord("-", 5), "-", "- passes through");
assert.strictEqual(V.transposeChord("", 5), "", "empty passes through");
assert.strictEqual(V.transposeChord("noColon", 5), "noColon", "no-colon passes through");
// NEGATIVE-modulo trap: C:maj shifted by -1 must wrap to B, not crash/negative.
assert.strictEqual(V.transposeChord("C:maj", -1), "B:maj", "negative offset wraps up to B");
assert.strictEqual(V.transposeChord("C:maj7", -3), "A:maj7", "negative offset wraps to A");
// transposeOffset stays within -5..+6.
for (let pc = 0; pc < 12; pc++) {
  for (const m of ["maj", "min"]) {
    const off = V.transposeOffset(pc, m);
    assert.ok(off >= -5 && off <= 6, `offset ${off} for pc=${pc} ${m} in range`);
  }
}
passed += 8;

// Object.prototype must not leak into the root/quality tables: a plain object
// literal would answer `"valueOf" in PITCH_CLASSES` with true and hand back a
// function for PITCH_CLASSES["constructor"], so those names would parse as
// valid roots. Python's dict lookup has no such fallthrough.
for (const magic of ["constructor", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "__proto__"]) {
  assert.ok(!(magic in V.PITCH_CLASSES), `${magic} is not a root`);
  assert.ok(!(magic in V.QUALITY_INTERVALS), `${magic} is not a quality`);
  assert.strictEqual(V.keyOffset(magic), 0, `keyOffset(${magic}) falls back to 0 like Python`);
  assert.strictEqual(V.transposeChord(`${magic}:maj`, 0), `${magic}:maj`, `${magic} root passes through`);
  assert.strictEqual(V.parseKey(magic).tonicPc, null, `parseKey(${magic}) has no tonic`);
  passed += 5;
}

console.log("chord_vocab: " + passed + " tests passed");
