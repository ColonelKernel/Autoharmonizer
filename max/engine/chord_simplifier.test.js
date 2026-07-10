"use strict";

/**
 * chord_simplifier.test.js — asserts the JS simplifier matches the Python
 * ChordSimplifier byte-for-byte over a broad label set (roots x suffixes,
 * playstyle glyphs, slash chords, rests, invalid tokens).
 *
 * Run with:  node chord_simplifier.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { simplifyChord } = require("./chord_simplifier.js");

let passed = 0;
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "simplify_chord.json"), "utf8")
);

for (const c of fixture) {
  // JSON null encodes the Python None input.
  const input = c.chord === null ? null : c.chord;
  assert.strictEqual(
    simplifyChord(input),
    c.out,
    `simplifyChord(${JSON.stringify(input)})`
  );
  passed++;
}

// Spot-check the documented semantics directly.
assert.strictEqual(simplifyChord("C"), "Invalid/No Chord", "bare note invalid");
assert.strictEqual(simplifyChord("F#"), "Invalid/No Chord", "bare sharp note invalid");
assert.strictEqual(simplifyChord("C-"), "Invalid/No Chord", "C- collapses to bare B, invalid");
assert.strictEqual(simplifyChord("B-maj7"), "B-:maj7", "flat root + maj7");
assert.strictEqual(simplifyChord("Cmaj7"), "C:maj7", "maj7 beats maj");
assert.strictEqual(simplifyChord("Cmin7"), "C:min7", "min7 beats min");
assert.strictEqual(simplifyChord("Cadd9"), "C:maj", "unrecognized-but-valid defaults to maj");
assert.strictEqual(simplifyChord(null), "Invalid/No Chord", "None -> invalid");
passed += 8;

console.log("chord_simplifier: " + passed + " tests passed");
