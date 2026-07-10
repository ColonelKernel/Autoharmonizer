"use strict";

/**
 * chord_vocab.js — chord root/quality vocabulary and key transposition.
 *
 * Direct port of python/src/chord_vocab.py. The corpora were built in a fixed
 * key space (tonic -> C for major, A for minor); every engine normalizes an
 * incoming chord into that space with keyOffset(), samples, then transposes
 * back with the negated offset. Any divergence from the Python here silently
 * corrupts every downstream lookup, so the constants and the exact modulo
 * convention are reproduced verbatim (see the fixture cross-check test).
 */

// Null-prototype so a lookup can never inherit from Object.prototype: with a
// plain object literal, `"valueOf" in PITCH_CLASSES` is true and
// PITCH_CLASSES["constructor"] returns a function, which would make those names
// masquerade as valid roots/qualities. Python's dict lookup has no such
// fallthrough, so this is what keeps `in`/[] lookups faithful to the reference.

// Note name (incl. enharmonics) -> pitch class 0..11.
const PITCH_CLASSES = Object.assign(Object.create(null), {
  C: 0, "B#": 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4,
  Fb: 4, F: 5, "E#": 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11,
});

// Pitch class 0..11 -> canonical spelling used in every corpus symbol.
const CANON_ROOT = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

// Shared base-quality vocabulary (quality -> interval set), authoritative list.
const QUALITY_INTERVALS = Object.assign(Object.create(null), {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], "7": [0, 4, 7, 10],
  dim7: [0, 3, 6, 9], hdim7: [0, 3, 6, 10], minmaj7: [0, 3, 7, 11],
  maj6: [0, 4, 7, 9], min6: [0, 3, 7, 9], "6": [0, 4, 7, 9],
  "9": [0, 4, 7, 10, 2], maj9: [0, 4, 7, 11, 2], min9: [0, 3, 7, 10, 2],
});

// JS `%` yields a NEGATIVE result for negative operands where Python's does not.
// Every modulo on a possibly-negative value must go through this to match the
// data's key-space arithmetic exactly.
function mod12(x) {
  return ((x % 12) + 12) % 12;
}

/**
 * parseKey(str) -> {tonicPc: number|null, mode: "maj"|"min"}.
 * Accepts 'C:maj' / 'A:min' (Root:mode), 'Eb major', 'Gm', bare 'C'.
 * Unknown/blank -> {tonicPc: null, mode: "maj"}.
 */
function parseKey(keyStr) {
  if (typeof keyStr !== "string" || !keyStr.trim()) {
    return { tonicPc: null, mode: "maj" };
  }
  keyStr = keyStr.trim();
  const pc = (root) => (root in PITCH_CLASSES ? PITCH_CLASSES[root] : null);
  if (keyStr.indexOf(":") !== -1) {
    // 'Gb:maj' — partition on first ':'.
    const i = keyStr.indexOf(":");
    const root = keyStr.slice(0, i);
    const mode = keyStr.slice(i + 1);
    return { tonicPc: pc(root), mode: mode.startsWith("min") ? "min" : "maj" };
  }
  if (keyStr.indexOf(" ") !== -1) {
    // 'Eb major'.
    const i = keyStr.indexOf(" ");
    const root = keyStr.slice(0, i);
    const mode = keyStr.slice(i + 1);
    return { tonicPc: pc(root), mode: mode.startsWith("min") ? "min" : "maj" };
  }
  if (keyStr.endsWith("m")) {
    // 'Gm'.
    return { tonicPc: pc(keyStr.slice(0, -1)), mode: "min" };
  }
  return { tonicPc: pc(keyStr), mode: "maj" };
}

/**
 * transposeOffset(tonicPc, mode) -> number|null.
 * Semitone shift putting the tonic at C (major) / A (minor), normalized -5..+6.
 */
function transposeOffset(tonicPc, mode) {
  if (tonicPc === null || tonicPc === undefined) {
    return null;
  }
  const target = mode === "maj" ? 0 : 9;
  const off = mod12(target - tonicPc);
  return off > 6 ? off - 12 : off;
}

/**
 * keyOffset(keyStr) -> number. Shift moving a chord in keyStr into C/Am space.
 * Returns 0 (identity) for an unknown/blank key.
 */
function keyOffset(keyStr) {
  const { tonicPc, mode } = parseKey(keyStr);
  const off = transposeOffset(tonicPc, mode);
  return off === null ? 0 : off;
}

/**
 * transposeChord(symbol, offset) -> string. Shift a 'Root:quality' symbol by
 * offset semitones (mod 12). Non-chord tokens ('', '-', 'N') and any token
 * lacking ':' pass through unchanged, as does an unrecognized root.
 */
function transposeChord(simple, offset) {
  if (simple === "" || simple === "-" || simple === "N" || simple.indexOf(":") === -1) {
    return simple;
  }
  const i = simple.indexOf(":");
  const root = simple.slice(0, i);
  const qual = simple.slice(i + 1);
  if (!(root in PITCH_CLASSES)) {
    return simple;
  }
  return `${CANON_ROOT[mod12(PITCH_CLASSES[root] + offset)]}:${qual}`;
}

module.exports = {
  PITCH_CLASSES,
  CANON_ROOT,
  QUALITY_INTERVALS,
  parseKey,
  transposeOffset,
  keyOffset,
  transposeChord,
};
