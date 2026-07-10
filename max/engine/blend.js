"use strict";

/**
 * blend.js — cross-corpus blending: Color (corpus morph) + Adventure
 * (temperature) + Gravity (cadence bias).
 *
 * Direct port of python/src/blend.py. Two performable dials act on the per-corpus
 * transition distributions:
 *   - Color c in [0,1] crossfades along an ordered path of single-corpus anchors
 *     (COLOR_PATH). Piecewise-linear, so anchors are pure single corpora and
 *     positions between them are genuine two-corpus blends.
 *   - Adventure a in [0,1] sets a sampling temperature tau: low sharpens toward
 *     the likeliest chord, high flattens the tail so rarer chords surface.
 * A third dial, Gravity, biases the result toward the tonic/dominant of the mode.
 *
 * blendedChoices returns Array<[target, prob]> ready for weighted sampling, or []
 * when the source chord is absent from every weighted corpus (the caller then
 * falls back to the pooled "all" chain / fallback policy).
 *
 * entries throughout are Array<[target, prob]> (the JS shape corpus.js produces).
 * Ordering is significant: sorts are DESCENDING by prob and STABLE, so ties keep
 * the incoming order — this reproduces Python's `sorted(key=lambda kv: -kv[1])`
 * over a dict built in a fixed insertion order. The parity fixture pins this.
 */

const { PITCH_CLASSES, keyOffset, transposeChord } = require("./chord_vocab.js");

// Ordered single-corpus anchors for the Color dial (config.COLOR_PATH):
// 0.0 = plainest (folk) ... 1.0 = spiciest (jazz).
const COLOR_PATH = ["nottingham", "pop909", "bach", "openbook"];

// Adventure -> tau linear interpolation bounds (config.ADVENTURE_TAU_*).
const ADVENTURE_TAU_MIN = 0.6;
const ADVENTURE_TAU_MAX = 1.8;

// Cadence / harmonic-gravity constants (config.*). Roots are fixed in the
// normalized C/Am space: C/G for major, A/E for minor.
const TONIC_PC = { maj: 0, min: 9 };
const DOMINANT_PC = { maj: 7, min: 4 };
const CADENCE_TONIC_BOOST = 3.0;
const CADENCE_DOMINANT_BOOST = 1.2;

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * colorWeights(c, available) -> Map<name, weight> summing to 1.
 * Anchors absent from `available` are dropped from the path first, so the dial
 * still spans whatever corpora actually loaded. `available` null/undefined keeps
 * the whole path.
 */
function colorWeights(c, available) {
  const path = COLOR_PATH.filter(
    (name) => available == null || available.indexOf(name) !== -1
  );
  if (path.length === 0) return new Map();
  if (path.length === 1) return new Map([[path[0], 1.0]]);

  c = clamp01(c);
  const span = path.length - 1;
  const pos = c * span;
  // Segment index; clamp so c==1 stays inside the last segment (frac -> 1).
  const i = Math.min(Math.floor(pos), span - 1);
  const frac = pos - i;
  const weights = new Map();
  for (const name of path) weights.set(name, 0.0);
  weights.set(path[i], weights.get(path[i]) + (1.0 - frac));
  weights.set(path[i + 1], weights.get(path[i + 1]) + frac);
  // Drop zero-weight anchors, preserving path order.
  const out = new Map();
  for (const [k, v] of weights) if (v > 0.0) out.set(k, v);
  return out;
}

/** temperature(a) -> tau. Linear: 0.6 + a*(1.8-0.6). */
function temperature(a) {
  a = clamp01(a);
  return ADVENTURE_TAU_MIN + a * (ADVENTURE_TAU_MAX - ADVENTURE_TAU_MIN);
}

/**
 * applyTemperature(entries, tau) -> reshaped entries, renormalized, SORTED
 * DESCENDING by prob. Reshape is p**(1/tau) over strictly-positive probs; a
 * non-positive tau is floored to 1e-3 (mirrors Python). Returns [] if the
 * reshaped mass is non-positive.
 */
function applyTemperature(entries, tau) {
  if (tau <= 0) tau = 1e-3;
  const inv = 1.0 / tau;
  const reshaped = []; // [target, p**inv], insertion order preserved
  let total = 0;
  for (const [t, p] of entries) {
    if (p > 0.0) {
      const v = Math.pow(p, inv);
      reshaped.push([t, v]);
      total += v;
    }
  }
  if (total <= 0) return [];
  const out = reshaped.map(([t, v]) => [t, v / total]);
  // Descending, stable: ties keep the reshaped (insertion) order, matching
  // Python's `sorted(key=lambda kv: -kv[1])`.
  out.sort((a, b) => b[1] - a[1]);
  return out;
}

/** Pitch class of a 'Root:quality' symbol's root, or null for non-chords. */
function rootPc(chord) {
  const i = chord.indexOf(":");
  const root = i === -1 ? chord : chord.slice(0, i); // partition(":")[0]
  const pc = PITCH_CLASSES[root];
  return pc === undefined ? null : pc;
}

/**
 * applyCadence(entries, mode, gravity) -> entries biased toward the tonic (and
 * secondarily the dominant) of `mode`, renormalized and re-sorted descending.
 * gravity <= 0 (or empty entries) is identity. Assumes entries are in normalized
 * C/Am space so the tonic/dominant roots are fixed per mode.
 */
function applyCadence(entries, mode, gravity) {
  if (gravity <= 0 || entries.length === 0) return entries;
  const tonic = mode in TONIC_PC ? TONIC_PC[mode] : TONIC_PC.maj;
  const dom = mode in DOMINANT_PC ? DOMINANT_PC[mode] : DOMINANT_PC.maj;
  const boosted = [];
  let total = 0;
  for (const [target, prob0] of entries) {
    let prob = prob0;
    const pc = rootPc(target);
    if (pc === tonic) prob *= 1.0 + gravity * CADENCE_TONIC_BOOST;
    else if (pc === dom) prob *= 1.0 + gravity * CADENCE_DOMINANT_BOOST;
    boosted.push([target, prob]);
    total += prob;
  }
  if (total <= 0) return entries;
  const out = boosted.map(([t, p]) => [t, p / total]);
  out.sort((a, b) => b[1] - a[1]);
  return out;
}

/**
 * blendedChoices(corpora, weights, tau, sourceChord, mode, gravity)
 *   -> Array<[target, prob]> (empty if sourceChord unknown in all weighted corpora).
 *
 * For each weighted corpus that CONTAINS sourceChord: mixed[target] += w * prob.
 * Then divide every value by total_weight (summed weight of ONLY the corpora that
 * had it), apply temperature, then cadence. sourceChord must already be in
 * normalized (C/Am) key space.
 */
function blendedChoices(corpora, weights, tau, sourceChord, mode, gravity) {
  mode = mode === undefined ? "maj" : mode;
  gravity = gravity === undefined ? 0.0 : gravity;

  const mixed = new Map(); // target -> accumulated w*prob, first-seen order
  let totalWeight = 0.0;
  // Iterate weights in insertion order (color_weights path order) so the mixed
  // insertion order — and thus post-sort tie-breaking — matches Python.
  for (const [name, w] of weights) {
    if (w <= 0) continue;
    if (!corpora.has(name, sourceChord)) continue; // present & non-empty
    const dist = corpora.distBySource(name).get(sourceChord);
    totalWeight += w;
    for (const [target, prob] of dist) {
      mixed.set(target, (mixed.get(target) || 0.0) + w * prob);
    }
  }

  if (mixed.size === 0 || totalWeight <= 0) return [];

  // Renormalize by the summed weight of only the corpora that contributed.
  const norm = [];
  for (const [t, p] of mixed) norm.push([t, p / totalWeight]);
  return applyCadence(applyTemperature(norm, tau), mode, gravity);
}

/**
 * normalizeToKey(chord, key) -> [normalizedChord, offset].
 * Transpose an in-key chord into normalized (C/Am) space; apply -offset to get
 * back to the key.
 */
function normalizeToKey(chord, key) {
  const offset = keyOffset(key);
  return [transposeChord(chord, offset), offset];
}

module.exports = {
  COLOR_PATH,
  colorWeights,
  temperature,
  applyTemperature,
  applyCadence,
  blendedChoices,
  normalizeToKey,
};
