"use strict";

/**
 * theory.test.js — cross-checks theory.js against Python reference output
 * dumped by scratchpad/gen_theory_fixtures.py over a broad grid: every quality
 * in the 36-symbol vocab x roots 0..11 x keys {C:maj, A:min, Eb:maj, F#:min,
 * G:maj, Bb:maj}. The v4 constraint layer trusts these labels to gate the
 * learned distribution, so we assert EXACT equality rather than spot cases.
 *
 * Run with:  node theory.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const T = require("./theory.js");

let passed = 0;
const FX = path.join(__dirname, "fixtures");
function fx(name) {
  return JSON.parse(fs.readFileSync(path.join(FX, name), "utf8"));
}

// parseChord: symbol round-trip (Root:quality[/Bass], no-colon, aliases,
// unicode flat/sharp, junk). Result is {rootPc, quality, bassPc} or null.
for (const c of fx("theory_parse_chord.json")) {
  const got = T.parseChord(c.symbol);
  assert.deepStrictEqual(got, c.chord, `parseChord(${JSON.stringify(c.symbol)})`);
  passed++;
}

// chordComplexityTier over the (symbol x key) grid.
for (const c of fx("theory_complexity_tier.json")) {
  assert.strictEqual(
    T.chordComplexityTier(c.symbol, c.key), c.out,
    `chordComplexityTier(${JSON.stringify(c.symbol)}, ${JSON.stringify(c.key)})`
  );
  passed++;
}

// harmonicFunction over the (symbol x key) grid.
for (const c of fx("theory_harmonic_function.json")) {
  assert.strictEqual(
    T.harmonicFunction(c.symbol, c.key), c.out,
    `harmonicFunction(${JSON.stringify(c.symbol)}, ${JSON.stringify(c.key)})`
  );
  passed++;
}

// isDiatonic over the (symbol x key) grid.
for (const c of fx("theory_is_diatonic.json")) {
  assert.strictEqual(
    T.isDiatonic(c.symbol, c.key), c.out,
    `isDiatonic(${JSON.stringify(c.symbol)}, ${JSON.stringify(c.key)})`
  );
  passed++;
}

// diatonicQuality(rootPc, key, {seventh}) over roots x keys x seventh.
for (const c of fx("theory_diatonic_quality.json")) {
  assert.strictEqual(
    T.diatonicQuality(c.rootPc, c.key, { seventh: c.seventh }), c.out,
    `diatonicQuality(${c.rootPc}, ${JSON.stringify(c.key)}, seventh=${c.seventh})`
  );
  passed++;
}

// reduceForNeural (key-independent) over the grid + the parse edge cases.
for (const c of fx("theory_reduce_for_neural.json")) {
  assert.strictEqual(
    T.reduceForNeural(c.symbol), c.out,
    `reduceForNeural(${JSON.stringify(c.symbol)})`
  );
  passed++;
}

// nearestScaleRoot(rootPc, key) over roots x keys (ties move upward).
for (const c of fx("theory_nearest_scale_root.json")) {
  assert.strictEqual(
    T.nearestScaleRoot(c.rootPc, c.key), c.out,
    `nearestScaleRoot(${c.rootPc}, ${JSON.stringify(c.key)})`
  );
  passed++;
}

// complexityLevel over a spread of in/out-of-range values.
for (const c of fx("theory_complexity_level.json")) {
  assert.strictEqual(
    T.complexityLevel(c.value), c.out,
    `complexityLevel(${c.value})`
  );
  passed++;
}

// Non-numeric / nullish complexity control values are unparseable floats in
// Python (float() raises) and clamp to tier 0.
for (const bad of ["x", "", null, undefined, {}]) {
  assert.strictEqual(T.complexityLevel(bad), 0, `complexityLevel(${String(bad)}) -> 0`);
  passed++;
}
// A genuine numeric NaN/Infinity is NOT a parse failure in Python: float(nan)
// succeeds, and Python's min/max clamp NaN and +Infinity to 1.0 (tier 4) and
// -Infinity to 0.0. Match that exactly (the dial can't emit these, but the port
// is faithful for every numeric input rather than quietly diverging).
assert.strictEqual(T.complexityLevel(NaN), 4, "complexityLevel(NaN) -> 4 (Python parity)");
assert.strictEqual(T.complexityLevel(Infinity), 4, "complexityLevel(+Infinity) -> 4");
assert.strictEqual(T.complexityLevel(-Infinity), 0, "complexityLevel(-Infinity) -> 0");
passed += 3;

// parseChord accepts a Python-style Chord object round-tripped through the
// function-taking helpers (they accept a symbol OR a parsed object).
const parsed = T.parseChord("D:7");
assert.strictEqual(T.harmonicFunction(parsed, "C:maj"), "D", "parsed object accepted by harmonicFunction");
assert.strictEqual(T.chordComplexityTier(parsed, "C:maj"), 2, "parsed object accepted by chordComplexityTier");
assert.strictEqual(T.isDiatonic(parsed, "C:maj"), false, "parsed object accepted by isDiatonic");
passed += 3;

// Exported constants match the reference sets/tables.
assert.deepStrictEqual([...T.TRIAD_QUALITIES].sort(),
  ["aug", "dim", "maj", "min", "sus2", "sus4"].sort(), "TRIAD_QUALITIES");
assert.deepStrictEqual(T.DIATONIC_TRIADS.maj,
  ["maj", "min", "min", "maj", "maj", "min", "dim"], "DIATONIC_TRIADS.maj");
assert.deepStrictEqual(T.DIATONIC_SEVENTHS.min,
  ["min7", "hdim7", "maj7", "min7", "7", "maj7", "7", "dim7"], "DIATONIC_SEVENTHS.min");
assert.deepStrictEqual(T.MAJOR_SCALE, [0, 2, 4, 5, 7, 9, 11], "MAJOR_SCALE");
assert.deepStrictEqual(T.MINOR_SCALE, [0, 2, 3, 5, 7, 8, 10, 11], "MINOR_SCALE");
passed += 5;

// scalePitchClasses shape: [tonic, mode, Set].
const [tonic, mode, set] = T.scalePitchClasses("A:min");
assert.strictEqual(tonic, 9, "scalePitchClasses tonic");
assert.strictEqual(mode, "min", "scalePitchClasses mode");
assert.ok(set instanceof Set && set.has(9) && set.has(11), "scalePitchClasses set");
passed += 1;

console.log("theory: " + passed + " tests passed");
