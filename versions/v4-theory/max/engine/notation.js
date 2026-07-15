"use strict";

/**
 * notation.js — spelling bridge between this project's chords and JazzNet's.
 *
 * We spell flats with a trailing 'b' (Bb:maj7); JazzNet spells them with '-'
 * (B-:maj7). Sharps and the Root:quality colon format are identical, so only
 * the flat marker in the ROOT differs. Direct port of
 * python/src/engines/notation.py — the neural engines convert in before lookup
 * and out before sonifying, so the transform must be exactly reversible for the
 * colon case.
 *
 * Note the no-colon branch mirrors the Python verbatim: it replaces every flat
 * marker in the whole token (there is no root/quality split without a ':').
 */

// Replace all occurrences (Python str.replace replaces every match).
function replaceAll(s, from, to) {
  return s.split(from).join(to);
}

/** toJazznet('Bb:maj7') -> 'B-:maj7' (flat 'b' in the root becomes '-'). */
function toJazznet(chord) {
  if (!chord || chord.indexOf(":") === -1) {
    return chord ? replaceAll(chord, "b", "-") : chord;
  }
  const i = chord.indexOf(":");
  const root = chord.slice(0, i);
  const qual = chord.slice(i + 1);
  return `${replaceAll(root, "b", "-")}:${qual}`;
}

/** fromJazznet('B-:maj7') -> 'Bb:maj7' (dash flat in the root becomes 'b'). */
function fromJazznet(chord) {
  if (!chord || chord.indexOf(":") === -1) {
    return chord ? replaceAll(chord, "-", "b") : chord;
  }
  const i = chord.indexOf(":");
  const root = chord.slice(0, i);
  const qual = chord.slice(i + 1);
  return `${replaceAll(root, "-", "b")}:${qual}`;
}

module.exports = { toJazznet, fromJazznet };
