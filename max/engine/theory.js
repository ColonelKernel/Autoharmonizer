"use strict";

/**
 * theory.js — dependency-free harmony vocabulary for the v4 constraint layer.
 *
 * Direct port of python/src/harmony/theory.py. The learned models still
 * provide the probability distribution; this module only describes the musical
 * structure needed to decide how much of that distribution is appropriate at a
 * requested complexity level.
 *
 * Parity is asserted against golden I/O dumped from the reference module (see
 * theory.test.js). Two Python behaviors are load-bearing and reproduced
 * verbatim:
 *   - Python's `%` is non-negative; JS `%` is not. Every modulo on a value
 *     that can go negative (degree = root - tonic, secondary-dominant root - 7)
 *     goes through mod12().
 *   - _degreeIndex sorts the scale and uses .index — the SORTED scale, not the
 *     raw declaration order (which matters for the 8-note minor scale).
 */

const {
  CANON_ROOT,
  PITCH_CLASSES,
  QUALITY_INTERVALS,
  parseKey,
} = require("./chord_vocab.js");

// Scale pitch-class sets (as sorted arrays; membership via Set). The minor
// scale is natural minor plus the raised leading tone used by functional
// dominants, so it carries 8 degrees.
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10, 11];

const TRIAD_QUALITIES = new Set(["maj", "min", "dim", "aug", "sus2", "sus4"]);
const SEVENTH_QUALITIES = new Set([
  "maj7", "min7", "7", "dim7", "hdim7", "minmaj7", "maj6", "min6", "6",
]);
const EXTENDED_QUALITIES = new Set([
  "add9", "madd9", "6/9", "9", "maj9", "min9", "11", "maj11",
  "min11", "13", "maj13", "min13",
]);
const ALTERED_QUALITIES = new Set([
  "7b5", "7#5", "7b9", "7#9", "7#11", "7b13", "9#11", "13#11", "maj7#11",
]);

const DIATONIC_TRIADS = {
  maj: ["maj", "min", "min", "maj", "maj", "min", "dim"],
  min: ["min", "dim", "maj", "min", "maj", "maj", "maj", "dim"],
};
const DIATONIC_SEVENTHS = {
  maj: ["maj7", "min7", "min7", "maj7", "7", "min7", "hdim7"],
  // Harmonic-function compromise: V is dominant and vii is diminished.
  min: ["min7", "hdim7", "maj7", "min7", "7", "maj7", "7", "dim7"],
};

// JS `%` yields a NEGATIVE result for negative operands; Python's does not.
function mod12(x) {
  return ((x % 12) + 12) % 12;
}

/**
 * parseChord(symbol) -> {rootPc, quality, bassPc} | null.
 *
 * Parses the runtime `Root:quality[/Bass]` form. Common no-colon major/minor
 * symbols are accepted as a convenience, but malformed or unknown qualities
 * return null rather than being guessed. bassPc is null when no bass is given.
 */
function parseChord(symbol) {
  if (typeof symbol !== "string") {
    return null;
  }
  const text = symbol.trim().replace(/♭/g, "b").replace(/♯/g, "#");
  if (!text || text === "-" || text === "N" || text === "N.C." || text === "NC") {
    return null;
  }
  // Python str.partition('/'): (before, sep, after); sep '' when absent.
  const sl = text.indexOf("/");
  const main = sl === -1 ? text : text.slice(0, sl);
  const slash = sl === -1 ? "" : "/";
  const bass = sl === -1 ? "" : text.slice(sl + 1);

  let root;
  let quality;
  if (main.indexOf(":") !== -1) {
    const ci = main.indexOf(":");
    root = main.slice(0, ci);
    quality = main.slice(ci + 1);
  } else {
    root = (main.length > 1 && (main[1] === "b" || main[1] === "#"))
      ? main.slice(0, 2)
      : main.slice(0, 1);
    const suffix = main.slice(root.length);
    quality = (suffix === "m" || suffix === "min") ? "min" : (suffix || "maj");
  }

  const rootPc = root in PITCH_CLASSES ? PITCH_CLASSES[root] : undefined;
  const bassPc = slash ? (bass in PITCH_CLASSES ? PITCH_CLASSES[bass] : undefined) : undefined;

  const aliases = { m: "min", m7: "min7", m9: "min9", m11: "min11", m13: "min13" };
  if (quality in aliases) {
    quality = aliases[quality];
  }

  if (rootPc === undefined || !(quality in QUALITY_INTERVALS)) {
    return null;
  }
  if (slash && bassPc === undefined) {
    return null;
  }
  return { rootPc, quality, bassPc: bassPc === undefined ? null : bassPc };
}

/** complexityLevel(value) -> 0..4. Map a normalized control value to tiers. */
function complexityLevel(value) {
  // Python does `float(value)` (raising -> tier 0 for non-numeric input) then
  // `max(0.0, min(1.0, x))`. A genuine numeric NaN/Infinity does NOT raise, and
  // Python's min/max return the comparison-false operand for NaN — so numeric
  // NaN and +Infinity clamp to 1.0 (tier 4) and -Infinity to 0.0. JS Math.min/
  // max instead PROPAGATE NaN, so reproduce Python's comparison semantics by
  // hand to keep parity for every numeric input.
  let n;
  if (typeof value === "number") {
    n = value; // float(number) never raises; keep NaN/Infinity for the clamp
  } else {
    n = Number(value);
    if (!Number.isFinite(n)) return 0; // float() raises on non-numeric -> 0
  }
  const mn = n < 1.0 ? n : 1.0; // min(1.0, n): NaN<1 is false -> 1.0
  const normalized = mn > 0.0 ? mn : 0.0; // max(0.0, mn): NaN>0 is false -> 0.0
  return Math.min(4, Math.trunc(normalized * 5.0));
}

/** scalePitchClasses(key) -> [tonic, mode, Set<int>]. */
function scalePitchClasses(key) {
  const { tonicPc, mode } = parseKey(key);
  const tonic = tonicPc === null || tonicPc === undefined ? 0 : tonicPc;
  const home = mode === "min" ? MINOR_SCALE : MAJOR_SCALE;
  const set = new Set(home.map((degree) => mod12(tonic + degree)));
  return [tonic, mode, set];
}

/** _degreeIndex(rootPc, tonic, mode) -> index into the SORTED scale, or null. */
function _degreeIndex(rootPc, tonic, mode) {
  // MAJOR_SCALE / MINOR_SCALE are already declared sorted (Python sorts them).
  const scale = mode === "min" ? MINOR_SCALE : MAJOR_SCALE;
  const degree = mod12(rootPc - tonic);
  const idx = scale.indexOf(degree);
  return idx === -1 ? null : idx;
}

/** diatonicQuality(rootPc, key, {seventh}) -> quality string | null. */
function diatonicQuality(rootPc, key, opts) {
  const seventh = opts && opts.seventh ? true : false;
  const [tonic, mode] = scalePitchClasses(key);
  const idx = _degreeIndex(rootPc, tonic, mode);
  if (idx === null) {
    return null;
  }
  const table = seventh ? DIATONIC_SEVENTHS : DIATONIC_TRIADS;
  return table[mode][idx];
}

/** isDiatonic(chord, key) -> boolean. chord is a symbol or a parsed object. */
function isDiatonic(chord, key) {
  const parsed = typeof chord === "string" ? parseChord(chord) : chord;
  if (parsed === null || parsed === undefined) {
    return false;
  }
  const [, , scale] = scalePitchClasses(key);
  const intervals = QUALITY_INTERVALS[parsed.quality];
  if (!intervals || intervals.length === 0) {
    return false;
  }
  // Pitch-class membership checks the quality as well as the root.
  return intervals.every((interval) => scale.has(mod12(parsed.rootPc + interval)));
}

/** harmonicFunction(chord, key) -> "T" | "PD" | "D" | "C". */
function harmonicFunction(chord, key) {
  const parsed = typeof chord === "string" ? parseChord(chord) : chord;
  if (parsed === null || parsed === undefined) {
    return "C";
  }
  const [tonic, mode] = scalePitchClasses(key);
  const degree = mod12(parsed.rootPc - tonic);
  const scale = mode === "min" ? MINOR_SCALE : MAJOR_SCALE;
  const index = scale.indexOf(degree) !== -1 ? scale.indexOf(degree) : null;
  const q = parsed.quality;
  if (q.startsWith("7") || q === "9" || q === "11" || q === "13" || q === "13#11") {
    // Any dominant chord is an applied dominant even if its root is chromatic.
    return "D";
  }
  if (index === 4 || index === 6) {
    return "D";
  }
  if (index === 1 || index === 3) {
    return "PD";
  }
  if (index === 0 || index === 2 || index === 5) {
    return "T";
  }
  return "C";
}

function _isSecondaryDominant(parsed, key) {
  const domQ = new Set(["7", "9", "11", "13", "7b9", "7#9", "7#11", "7b13", "13#11"]);
  if (!domQ.has(parsed.quality)) {
    return false;
  }
  const [tonic, mode] = scalePitchClasses(key);
  const scale = mode === "min" ? MINOR_SCALE : MAJOR_SCALE;
  // A dominant root is a fifth above some scale degree.
  const targets = new Set(scale.map((degree) => mod12(tonic + degree)));
  return targets.has(mod12(parsed.rootPc - 7)) && parsed.rootPc !== mod12(tonic + 7);
}

/**
 * chordComplexityTier(chord, key) -> 0..4.
 *
 * 0 diatonic triads; 1 diatonic sevenths/inversions; 2 borrowing/applied
 * dominants/diminished approaches; 3 extensions and substitutions; 4 altered
 * or otherwise remote chromatic harmony.
 */
function chordComplexityTier(chord, key) {
  const parsed = typeof chord === "string" ? parseChord(chord) : chord;
  if (parsed === null || parsed === undefined) {
    return 4;
  }
  const q = parsed.quality;
  if (ALTERED_QUALITIES.has(q)) {
    return 4;
  }
  if (EXTENDED_QUALITIES.has(q)) {
    return 3;
  }
  const [tonic] = scalePitchClasses(key);
  if ((q === "7" || q === "9" || q === "11" || q === "13") && parsed.rootPc === mod12(tonic + 1)) {
    return 3; // tritone substitute for V7
  }
  if (_isSecondaryDominant(parsed, key)) {
    return 2;
  }
  if (isDiatonic(parsed, key)) {
    if (parsed.bassPc !== null && parsed.bassPc !== undefined) {
      return 1;
    }
    if (SEVENTH_QUALITIES.has(q)) {
      return 1;
    }
    if (TRIAD_QUALITIES.has(q)) {
      return 0;
    }
    return 1;
  }
  if (q === "dim" || q === "dim7" || q === "hdim7" || q === "aug") {
    return 2;
  }
  if (TRIAD_QUALITIES.has(q) || SEVENTH_QUALITIES.has(q)) {
    return 2;
  }
  return 4;
}

/** nearestScaleRoot(rootPc, key) -> pitch class of nearest scale root (ties up). */
function nearestScaleRoot(rootPc, key) {
  const [, , scale] = scalePitchClasses(key);
  let best = null;
  let bestKey = null;
  for (const pc of scale) {
    const up = mod12(pc - rootPc);
    const down = mod12(rootPc - pc);
    const k = [Math.min(up, down), up];
    if (bestKey === null || k[0] < bestKey[0] || (k[0] === bestKey[0] && k[1] < bestKey[1])) {
      bestKey = k;
      best = pc;
    }
  }
  return best;
}

/** reduceForNeural(symbol) -> JazzNet 7-quality spelling. */
function reduceForNeural(symbol) {
  const parsed = parseChord(symbol);
  if (parsed === null) {
    return symbol.split("/")[0];
  }
  const q = parsed.quality;
  let target;
  if (q === "dim" || q === "dim7") {
    target = "dim7";
  } else if (q === "hdim7") {
    target = "hdim7";
  } else if (q.startsWith("min") || q === "madd9" || q === "min6") {
    target = q !== "min" ? "min7" : "min";
  } else if (
    q === "7" || q === "9" || q === "11" || q === "13" ||
    q.startsWith("7") || q === "9#11" || q === "13#11"
  ) {
    target = "7";
  } else if (q.startsWith("maj") || q === "6" || q === "add9" || q === "6/9") {
    target = q !== "maj" ? "maj7" : "maj";
  } else {
    target = "maj";
  }
  return `${CANON_ROOT[parsed.rootPc]}:${target}`;
}

module.exports = {
  MAJOR_SCALE,
  MINOR_SCALE,
  TRIAD_QUALITIES,
  SEVENTH_QUALITIES,
  EXTENDED_QUALITIES,
  ALTERED_QUALITIES,
  DIATONIC_TRIADS,
  DIATONIC_SEVENTHS,
  parseChord,
  complexityLevel,
  scalePitchClasses,
  diatonicQuality,
  isDiatonic,
  harmonicFunction,
  chordComplexityTier,
  nearestScaleRoot,
  reduceForNeural,
};
