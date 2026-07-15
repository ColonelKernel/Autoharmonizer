"use strict";

/**
 * vocab.test.js — loadVocab against the real data/jazznet/vocab.json.
 * Run with:  node vocab.test.js
 */

const assert = require("assert");
const path = require("path");
const { loadVocab } = require("./vocab.js");

let passed = 0;

const VOCAB_PATH = path.join(__dirname, "..", "..", "data", "jazznet", "vocab.json");
const v = loadVocab(VOCAB_PATH);

assert.strictEqual(v.vocabSize, 118, "118 tokens");
assert.strictEqual(v.idxToChord.length, 118, "idxToChord has 118 entries");
assert.strictEqual(v.padIdx, 0, "pad=0");
assert.strictEqual(v.bosIdx, 1, "BOS=1");
assert.strictEqual(v.eosIdx, 2, "EOS=2");
passed += 5;

// Specials flagged, real chords not.
assert.ok(v.isSpecial(0) && v.isSpecial(1) && v.isSpecial(2), "0/1/2 special");
assert.ok(!v.isSpecial(3), "first real chord not special");
passed += 2;

// chordToIdx is a Map (integer-key ordering safety), round-trips every index.
assert.ok(v.chordToIdx instanceof Map, "chordToIdx is a Map");
for (let i = 0; i < v.vocabSize; i++) {
  const sym = v.indexChord(i);
  assert.strictEqual(v.chordIndex(sym), i, `round-trip index ${i} (${sym})`);
}
passed++;

// Special tokens carry their known spellings.
assert.strictEqual(v.indexChord(0), "pad", "idx 0 -> pad");
assert.strictEqual(v.indexChord(1), "<BOS>", "idx 1 -> <BOS>");
assert.strictEqual(v.indexChord(2), "<EOS>", "idx 2 -> <EOS>");
passed += 3;

// Unknown lookups -> null (not undefined, not a throw).
assert.strictEqual(v.chordIndex("Z:nope"), null, "unknown chord -> null");
assert.strictEqual(v.indexChord(999), null, "out-of-range idx -> null");
assert.strictEqual(v.indexChord(-1), null, "negative idx -> null");
passed += 3;

console.log("vocab: " + passed + " tests passed");
