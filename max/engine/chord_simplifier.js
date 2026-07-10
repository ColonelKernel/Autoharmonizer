"use strict";

/**
 * chord_simplifier.js — port of JazzNet's ChordSimplifier.
 *
 * Collapses rich openbook labels (slash chords, extensions, playstyle glyphs)
 * down to the seven MIREX qualities the neural vocab actually contains, so a
 * label the model never saw still resolves to something it can score. Direct
 * port of python/src/chord_simplifier.py; verified against the Python via the
 * fixture cross-check test.
 *
 * Notation note: flats here are the JazzNet dash form ('B-'), matching the
 * spelling the simplifier was written against.
 */

const JAZZ5_MIREX_KINDS = [":maj", ":min", ":maj7", ":min7", ":7", ":hdim7", ":dim7"];
const PLAYSTYLE_SYMBOLS = ["^", "*", ";", "+"];

// Root is 2 chars when the 2nd char is a flat/sharp marker, else 1 char.
function getRoot(chord) {
  if (!chord) return "";
  if (chord.length >= 2 && (chord[1] === "-" || chord[1] === "#")) {
    return chord.slice(0, 2);
  }
  return chord[0];
}

// A bare note name (optionally with -, #, or ^) is NOT a chord. 'C-' collapses
// to 'B' first (matching the Python re.sub) so it is caught by the same guard.
// The 'r' probe rejects rest markers ('r'/'r1'...) at the head of the token.
function isChord(chord) {
  if (chord.slice(0, 2).indexOf("r") !== -1) return false;
  const reduced = chord.replace(/C-/g, "B");
  if (reduced.length <= 2 && /^[A-G](-|#|\^)?$/.test(reduced)) return false;
  return true;
}

function chopChord(chord) {
  for (const symbol of PLAYSTYLE_SYMBOLS) {
    chord = chord.split(symbol).join("");
  }
  return chord;
}

// Quality is decided by the FIRST matching substring in this fixed order, so
// 'maj7' wins over 'maj', 'min7' over 'min', and the single-letter 'h'/'o'
// pick up half-diminished / diminished-seventh spellings.
function extractChordQuality(chord) {
  const qualityList = [
    ["maj7", JAZZ5_MIREX_KINDS[2]],
    ["min7", JAZZ5_MIREX_KINDS[3]],
    ["h", JAZZ5_MIREX_KINDS[5]],
    ["o", JAZZ5_MIREX_KINDS[6]],
    ["7", JAZZ5_MIREX_KINDS[4]],
    ["maj", JAZZ5_MIREX_KINDS[0]],
    ["min", JAZZ5_MIREX_KINDS[1]],
  ];
  for (const [quality, chordType] of qualityList) {
    if (chord.indexOf(quality) !== -1) return chordType;
  }
  return null;
}

/**
 * simplifyChord(chord) -> 'Root:quality' in the seven MIREX kinds, or the
 * literal 'Invalid/No Chord'. Any recognized-but-unmatched chord defaults to
 * ':maj'.
 */
function simplifyChord(chord) {
  if (chord === null || chord === undefined || !isChord(chord)) {
    return "Invalid/No Chord";
  }
  const rootNote = getRoot(chord);
  chord = chopChord(chord);
  if (!isChord(chord)) {
    return "Invalid/No Chord";
  }
  const chordType = extractChordQuality(chord);
  if (chordType !== null) {
    return rootNote + chordType;
  }
  // In the Python, the basic/extended/slash regex branch and the final
  // fallback BOTH return root + ':maj', so any surviving chord defaults to maj.
  return rootNote + JAZZ5_MIREX_KINDS[0];
}

module.exports = { simplifyChord };
