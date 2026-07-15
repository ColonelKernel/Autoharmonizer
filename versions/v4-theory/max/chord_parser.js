/**
 * chord_parser.js — pure-JavaScript chord symbol parser + voicing engine.
 *
 * Responsibilities ONLY (no Max / OSC / lifecycle code lives here):
 *
 *     chord symbol  ->  normalized representation
 *                   ->  root pitch class + interval pattern
 *                   ->  pitch classes
 *                   ->  MIDI voicing (close position or nearest voice-leading)
 *
 * The module is dependency-free CommonJS so it runs unchanged inside
 * Node-for-Max and under plain `node` for the unit tests.
 *
 * Supported input dialects (see README / spec section 8):
 *   - Common jazz/pop notation:  Cmaj7, F#m7, Bb7, Cdim7, Cm7b5, Cmaj7/G ...
 *   - Colon dataset notation:    C:maj, G:7, D:min7, A:hdim7, G:sus4 ...
 *   - Glyphs:                     ♭ ♯ Δ ° ø +  -
 *   - No-chord:                   N.C.  NC  no_chord  (parsed as silence)
 */

"use strict";

/* ------------------------------------------------------------------ *
 * 1. Pitch-class fundamentals
 * ------------------------------------------------------------------ */

// Natural note letter -> semitone within an octave (C = 0).
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Accidental glyph/char -> semitone offset.
const ACCIDENTAL = { "#": 1, "b": -1, "x": 2 };

/* ------------------------------------------------------------------ *
 * 2. Chord quality dictionary
 *
 * Qualities are stored ONCE as interval patterns measured from the
 * root (never as absolute notes and never duplicated per root).  The
 * same table is reused for every one of the 12 roots.
 * ------------------------------------------------------------------ */

const QUALITIES = {
  // --- triads ------------------------------------------------------
  "": [0, 4, 7], // bare symbol = major
  maj: [0, 4, 7],
  major: [0, 4, 7],
  M: [0, 4, 7],
  Maj: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  minor: [0, 3, 7],
  Min: [0, 3, 7],
  "-": [0, 3, 7],
  "5": [0, 7], // power chord
  dim: [0, 3, 6],
  o: [0, 3, 6],
  aug: [0, 4, 8],
  Aug: [0, 4, 8],
  "+": [0, 4, 8],
  sus: [0, 5, 7],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],

  // --- sixth chords ------------------------------------------------
  "6": [0, 4, 7, 9],
  maj6: [0, 4, 7, 9],
  M6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  min6: [0, 3, 7, 9],
  "-6": [0, 3, 7, 9],
  "6/9": [0, 4, 7, 9, 14],
  "69": [0, 4, 7, 9, 14],

  // --- seventh chords ---------------------------------------------
  "7": [0, 4, 7, 10], // dominant 7
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  ma7: [0, 4, 7, 11],
  Maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  Min7: [0, 3, 7, 10],
  "-7": [0, 3, 7, 10],
  mMaj7: [0, 3, 7, 11],
  mM7: [0, 3, 7, 11],
  minmaj7: [0, 3, 7, 11],
  "-maj7": [0, 3, 7, 11],
  dim7: [0, 3, 6, 9],
  o7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10], // half-diminished
  min7b5: [0, 3, 6, 10],
  hdim7: [0, 3, 6, 10], // colon-dataset spelling
  hdim: [0, 3, 6, 10],

  // --- add / extended ---------------------------------------------
  add9: [0, 4, 7, 14],
  add2: [0, 2, 4, 7],
  madd9: [0, 3, 7, 14],
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  M9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  min9: [0, 3, 7, 10, 14],
  "11": [0, 7, 10, 14, 17], // dom11 (3rd usually dropped)
  maj11: [0, 4, 7, 11, 14, 17],
  m11: [0, 3, 7, 10, 14, 17],
  min11: [0, 3, 7, 10, 14, 17],
  "13": [0, 4, 7, 10, 14, 21], // dom13 (11th dropped)
  maj13: [0, 4, 7, 11, 14, 21],
  m13: [0, 3, 7, 10, 14, 21],
  min13: [0, 3, 7, 10, 14, 21],

  // --- altered dominants (explicit, incl. parenthesised forms) ----
  "7b5": [0, 4, 6, 10],
  "7#5": [0, 4, 8, 10],
  "7b9": [0, 4, 7, 10, 13],
  "7#9": [0, 4, 7, 10, 15],
  "7#11": [0, 4, 7, 10, 18],
  "7b13": [0, 4, 7, 10, 20],
  "9#11": [0, 4, 7, 10, 14, 18],
  "13#11": [0, 4, 7, 10, 14, 18, 21],
  "maj7#11": [0, 4, 7, 11, 18],
  "M7#11": [0, 4, 7, 11, 18],
};

// Which quality-table keys are unambiguous *words* (length >= 3, contain a
// letter run) and may therefore be matched case-insensitively as a fallback.
// Single-letter markers (M / m) are deliberately EXCLUDED so that "M7" is
// never silently lower-cased into "m7" (major vs minor confusion).
const WORDY = /(maj|min|dim|aug|sus|add|hdim|dom)/i;

/* ------------------------------------------------------------------ *
 * 3. Normalization
 * ------------------------------------------------------------------ */

const NO_CHORD_TOKENS = new Set([
  "n.c.",
  "nc",
  "no_chord",
  "nochord",
  "n.c",
  "silence",
  "rest",
  "-",
]);

/**
 * Clean a raw symbol coming off OSC / a text field.
 * Trims whitespace, strips surrounding quotes and stray newlines, and
 * converts unicode accidentals to ASCII.  Does NOT change musical case.
 */
function normalizeSymbol(raw) {
  let s = String(raw == null ? "" : raw);
  // strip newlines / carriage returns / tabs anywhere
  s = s.replace(/[\r\n\t]+/g, " ");
  // collapse internal whitespace, then trim
  s = s.replace(/\s+/g, " ").trim();
  // strip a single layer of surrounding quotes (straight or curly)
  s = s.replace(/^['"‘’“”]+/, "");
  s = s.replace(/['"‘’“”]+$/, "");
  s = s.trim();
  // unicode accidentals -> ascii
  s = s.replace(/♭/g, "b").replace(/♯/g, "#"); // ♭ ♯
  s = s.replace(/𝄫/g, "bb"); // 𝄫 double flat (rare)
  s = s.replace(/𝄪/g, "x"); // 𝄪 double sharp (rare)
  // remove interior spaces entirely for the musical token (keep it compact)
  s = s.replace(/\s+/g, "");
  return s;
}

function isNoChord(normalized) {
  if (normalized === "") return true;
  return NO_CHORD_TOKENS.has(normalized.toLowerCase());
}

/* ------------------------------------------------------------------ *
 * 4. Root parsing
 * ------------------------------------------------------------------ */

/**
 * Parse a leading root (uppercase letter A-G + optional accidentals).
 * Returns { letter, accidental, pitchClass, length } or null.
 *
 * Root letters are REQUIRED to be uppercase so that a lone "B" is never
 * mistaken for a flat "b" and vice-versa.
 */
function parseRoot(str) {
  const m = /^([A-G])([#bx]*)/.exec(str);
  if (!m) return null;
  const letter = m[1];
  const accStr = m[2];
  let pc = NOTE_BASE[letter];
  for (const ch of accStr) pc += ACCIDENTAL[ch] || 0;
  pc = ((pc % 12) + 12) % 12;
  return {
    letter,
    accidental: accStr,
    root: letter + accStr,
    pitchClass: pc,
    length: m[0].length,
  };
}

/* ------------------------------------------------------------------ *
 * 5. Quality parsing
 * ------------------------------------------------------------------ */

/**
 * Canonicalize a quality string: map glyphs, strip parentheses/commas.
 * Order matters (multi-char glyph forms handled before single-char).
 */
function canonicalizeQuality(q) {
  let s = q;
  s = s.replace(/[Δ△]/g, "maj"); // Δ △ -> maj  (so Δ7 -> maj7)
  s = s.replace(/ø7/g, "m7b5").replace(/ø/g, "m7b5"); // ø7 / ø
  s = s.replace(/[°º]7/g, "dim7"); // °7 / º7
  s = s.replace(/[°º]/g, "dim"); // ° / º
  s = s.replace(/[()\[\],\s]/g, ""); // drop brackets / commas / spaces
  return s;
}

/**
 * Resolve a quality string to an interval array, or null if unsupported.
 */
function lookupQuality(rawQuality) {
  const q = canonicalizeQuality(rawQuality);

  // 1. exact (case-sensitive) match — resolves the M7 vs m7 ambiguity.
  if (Object.prototype.hasOwnProperty.call(QUALITIES, q)) {
    return QUALITIES[q].slice();
  }

  // 2. guarded case-insensitive match, ONLY for wordy qualities so that
  //    bare single-letter M/m are never conflated.
  if (WORDY.test(q)) {
    const lower = q.toLowerCase();
    for (const key of Object.keys(QUALITIES)) {
      if (key.toLowerCase() === lower && WORDY.test(key)) {
        return QUALITIES[key].slice();
      }
    }
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * 6. Full chord parsing
 * ------------------------------------------------------------------ */

/**
 * Parse a chord symbol into a structured representation.
 *
 * On success returns:
 *   {
 *     originalSymbol, normalizedSymbol, isNoChord:false,
 *     root, rootPitchClass, quality, intervals, pitchClasses,
 *     bass, bassPitchClass            // bass fields null when no slash
 *   }
 *
 * For a no-chord returns { ..., isNoChord:true, pitchClasses:[] }.
 *
 * On failure returns { ..., error:{ code, detail } } where code is one of
 *   "invalid_root" | "unsupported_chord" | "unsupported_modifier".
 */
function parseChord(raw) {
  const originalSymbol = String(raw == null ? "" : raw);
  const normalizedSymbol = normalizeSymbol(originalSymbol);

  if (isNoChord(normalizedSymbol)) {
    return {
      originalSymbol,
      normalizedSymbol: normalizedSymbol === "" ? "N.C." : normalizedSymbol,
      isNoChord: true,
      root: null,
      rootPitchClass: null,
      quality: null,
      intervals: [],
      pitchClasses: [],
      bass: null,
      bassPitchClass: null,
    };
  }

  // Split off a slash bass (last '/').  The quality "6/9" contains its own
  // slash, so it must remain part of the main chord token.  Using the last
  // slash also lets a real inversion follow that quality: C:6/9/G.
  let main = normalizedSymbol;
  let bassStr = null;
  const slash = main.lastIndexOf("/");
  const slashBelongsToSixNine = slash !== -1 && main.endsWith("6/9");
  if (slash !== -1 && !slashBelongsToSixNine) {
    bassStr = main.slice(slash + 1);
    main = main.slice(0, slash);
  }

  // Colon dataset notation:  Root:quality
  let rootStr;
  let qualityStr;
  const colon = main.indexOf(":");
  if (colon !== -1) {
    rootStr = main.slice(0, colon);
    qualityStr = main.slice(colon + 1);
    const r = parseRoot(rootStr);
    if (!r || r.length !== rootStr.length) {
      return failure(originalSymbol, normalizedSymbol, "invalid_root", normalizedSymbol);
    }
    var rootInfo = r;
  } else {
    const r = parseRoot(main);
    if (!r) {
      return failure(originalSymbol, normalizedSymbol, "invalid_root", normalizedSymbol);
    }
    rootInfo = r;
    qualityStr = main.slice(r.length);
  }

  const intervals = lookupQuality(qualityStr);
  if (!intervals) {
    // Root was valid, so the offending part is the quality/modifier.
    return failure(
      originalSymbol,
      normalizedSymbol,
      "unsupported_modifier",
      normalizedSymbol
    );
  }

  // Optional slash bass.
  let bass = null;
  let bassPitchClass = null;
  if (bassStr !== null) {
    const b = parseRoot(bassStr);
    if (!b || b.length !== bassStr.length) {
      return failure(originalSymbol, normalizedSymbol, "invalid_root", normalizedSymbol);
    }
    bass = b.root;
    bassPitchClass = b.pitchClass;
  }

  const rootPc = rootInfo.pitchClass;
  const pitchClasses = intervals.map((iv) => ((rootPc + iv) % 12 + 12) % 12);

  return {
    originalSymbol,
    normalizedSymbol,
    isNoChord: false,
    root: rootInfo.root,
    rootPitchClass: rootPc,
    quality: canonicalizeQuality(qualityStr) || "maj",
    intervals: intervals.slice(),
    pitchClasses,
    bass,
    bassPitchClass,
  };
}

function failure(originalSymbol, normalizedSymbol, code, detail) {
  return {
    originalSymbol,
    normalizedSymbol,
    isNoChord: false,
    root: null,
    rootPitchClass: null,
    quality: null,
    intervals: [],
    pitchClasses: [],
    bass: null,
    bassPitchClass: null,
    error: { code, detail },
  };
}

/* ------------------------------------------------------------------ *
 * 7. Voicing engine
 * ------------------------------------------------------------------ */

const DEFAULT_VOICING_OPTIONS = {
  registerCenter: 60, // approx C4 — target centre of gravity
  low: 48, // C3   — bottom of the comfortable range
  high: 72, // C5   — top of the comfortable range
  // PROJECT CONSTRAINT: only major or minor triads are ever sonified.  The
  // parser still fully understands the incoming symbol (Cmaj7, Dm7b5, …); the
  // voicing engine collapses it to a plain triad.  Set false to voice the
  // full chord as understood by the parser.
  triadsOnly: true,
  // Performable "colour" controls (0..1). Each is a per-chord probability:
  //   colorMajor  — chance of forcing the triad to MAJOR
  //   colorMinor  — chance of forcing the triad to MINOR
  //   color7th    — chance of adding a flat-7th (major->dom7, minor->min7)
  // All 0 (default) => the natural major/minor triad, unchanged.
  colorMajor: 0,
  colorMinor: 0,
  color7th: 0,
};

// The only two chord shapes we ever sonify when triadsOnly is on.
const MAJOR_TRIAD = [0, 4, 7];
const MINOR_TRIAD = [0, 3, 7];

/**
 * Collapse any parsed chord to a MAJOR or MINOR triad.
 *
 * The quality is decided purely by the chord's third relative to the root:
 *   - a major third (interval 4) present anywhere  -> major triad [0,4,7]
 *   - else a minor third (interval 3) present       -> minor triad [0,3,7]
 *   - no third at all (power chords, sus chords)    -> default to major triad
 *
 * Testing 4 before 3 keeps altered dominants such as 7#9 ([0,4,7,10,15],
 * whose #9 is enharmonically a raised minor third) correctly MAJOR.
 *
 * @returns {{ intervals: number[], quality: "major"|"minor" }}
 */
function triadIntervals(parsed) {
  const iv = (parsed && parsed.intervals) || [];
  if (iv.indexOf(4) !== -1) return { intervals: MAJOR_TRIAD.slice(), quality: "major" };
  if (iv.indexOf(3) !== -1) return { intervals: MINOR_TRIAD.slice(), quality: "minor" };
  return { intervals: MAJOR_TRIAD.slice(), quality: "major" };
}

/**
 * Intervals actually used for voicing: the reduced triad when triadsOnly is
 * on (the default), otherwise the full chord the parser understood.
 */
function effectiveIntervals(parsed, opt) {
  return opt && opt.triadsOnly === false ? parsed.intervals : triadIntervals(parsed).intervals;
}

function clamp01(x) {
  x = Number(x);
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Apply the performable "colour" controls to a parsed chord and return the
 * FINAL interval set to voice. This is where the major/minor/7th knobs act.
 *
 * The decision is made ONCE here (it uses randomness), so the result can be
 * voiced deterministically by voiceChord/voiceLead. Pass `opt.rng` (a 0..1
 * function) to make it deterministic for tests.
 *
 *   - start from the chord's natural triad quality (major/minor by its third)
 *   - with probability colorMajor -> force MAJOR; else with probability
 *     colorMinor -> force MINOR (checked in that order)
 *   - with probability color7th -> add a flat-7th (major->dom7, minor->min7)
 *
 * When all three knobs are 0 this returns exactly the natural triad, so the
 * default behaviour is unchanged.  When triadsOnly is false AND no colour is
 * dialled in, the full parsed chord is returned untouched.
 *
 * @returns {{ intervals:number[], quality:"major"|"minor", seventh:boolean }}
 */
function colorChord(parsed, opt) {
  opt = opt || {};
  const cMaj = clamp01(opt.colorMajor || 0);
  const cMin = clamp01(opt.colorMinor || 0);
  const c7 = clamp01(opt.color7th || 0);
  const anyColor = cMaj > 0 || cMin > 0 || c7 > 0;

  if (opt.triadsOnly === false && !anyColor) {
    const q = triadIntervals(parsed).quality;
    return { intervals: parsed.intervals.slice(), quality: q, seventh: false };
  }

  const rng = typeof opt.rng === "function" ? opt.rng : Math.random;

  let quality = triadIntervals(parsed).quality; // natural major/minor
  const r = rng();
  if (r < cMaj) quality = "major";
  else if (r < cMaj + cMin) quality = "minor";

  const intervals = (quality === "major" ? MAJOR_TRIAD : MINOR_TRIAD).slice();
  let seventh = false;
  if (rng() < c7) {
    intervals.push(10); // flat-7th: major->dominant7, minor->minor7
    seventh = true;
  }
  return { intervals, quality, seventh };
}

function clampMidi(n) {
  return Math.max(0, Math.min(127, Math.round(n)));
}

/**
 * Close-position (root position) voicing.
 *
 * The chord is stacked from a root placed in the octave starting at
 * `low`, i.e. rootMidi = low + (rootPitchClass mod 12), then each interval
 * is added on top.  A slash bass is placed one octave below the root.
 *
 * With defaults this yields the canonical examples:
 *   Cmaj7 -> 48 52 55 59,  Dm7 -> 50 53 57 60,  G7 -> 55 59 62 65
 * (produced by the algorithm, NOT hard-coded).
 */
function voiceChord(parsed, options) {
  const opt = Object.assign({}, DEFAULT_VOICING_OPTIONS, options || {});
  if (!parsed || parsed.isNoChord || parsed.error) return [];

  const low = opt.low;
  const rootMidi = low + (((parsed.rootPitchClass % 12) + 12) % 12);
  const intervals = effectiveIntervals(parsed, opt);

  const notes = [];

  // Slash bass one octave below the chord root (kept as the lowest note).
  if (parsed.bassPitchClass != null) {
    const bassOctaveStart = low - 12; // e.g. 36 = C2
    let bassMidi = bassOctaveStart + (((parsed.bassPitchClass % 12) + 12) % 12);
    if (bassMidi >= rootMidi) bassMidi -= 12;
    notes.push(clampMidi(bassMidi));
  }

  for (const iv of intervals) {
    notes.push(clampMidi(rootMidi + iv));
  }

  return dedupeSorted(notes);
}

function dedupeSorted(notes) {
  return Array.from(new Set(notes)).sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ *
 * 8. Nearest-voicing (simple voice leading)
 * ------------------------------------------------------------------ */

/**
 * Generate candidate voicings for the chord: every inversion, shifted
 * across a few octaves, kept within (roughly) the target register.
 */
function candidateVoicings(parsed, opt) {
  const pcs = effectiveIntervals(parsed, opt).map(
    (iv) => (((parsed.rootPitchClass + iv) % 12) + 12) % 12
  );
  const uniquePcs = Array.from(new Set(pcs));
  const n = uniquePcs.length;
  const candidates = [];

  for (let inv = 0; inv < n; inv++) {
    // rotate so inversion `inv` is the lowest voice
    const order = [];
    for (let k = 0; k < n; k++) order.push(uniquePcs[(inv + k) % n]);

    for (let baseOct = -1; baseOct <= 1; baseOct++) {
      const startLow = opt.low + baseOct * 12;
      // place the first pc at/above startLow, then stack ascending
      let prev = startLow + (((order[0] - startLow) % 12) + 12) % 12;
      const voicing = [prev];
      for (let k = 1; k < order.length; k++) {
        let note = prev + ((((order[k] - prev) % 12) + 12) % 12);
        if (note <= prev) note += 12;
        voicing.push(note);
        prev = note;
      }
      candidates.push(voicing.map(clampMidi));
    }
  }
  return candidates;
}

/** Movement + register cost of a candidate relative to the previous voicing. */
function voicingCost(candidate, previous, opt) {
  let cost = 0;

  // register penalty: notes outside [low, high] are discouraged
  for (const note of candidate) {
    if (note < opt.low) cost += (opt.low - note) * 0.5;
    if (note > opt.high) cost += (note - opt.high) * 0.5;
  }
  // discourage spreads wider than the cap (raised by the Voicing dial for
  // open/drop-2 voicings; defaults to 24 = ~2 octaves).
  const cap = opt.spreadCap || 24;
  const spread = candidate[candidate.length - 1] - candidate[0];
  if (spread > cap) cost += (spread - cap) * 0.25;

  if (!previous || previous.length === 0) return cost;

  // nearest-note movement: for each candidate voice, distance to the
  // closest previous voice, plus a penalty for voice-count mismatch.
  let movement = 0;
  for (const note of candidate) {
    let best = Infinity;
    for (const p of previous) best = Math.min(best, Math.abs(note - p));
    movement += best;
  }
  cost += movement;
  cost += Math.abs(candidate.length - previous.length) * 2;
  return cost;
}

/**
 * Choose the candidate voicing nearest to `previousVoicing`.
 * Deterministic: ties are broken by the lower/earlier candidate.
 */
function voiceLead(parsed, previousVoicing, options) {
  const opt = Object.assign({}, DEFAULT_VOICING_OPTIONS, options || {});
  if (!parsed || parsed.isNoChord || parsed.error) return [];

  const base = voiceChord(parsed, opt);
  if (!previousVoicing || previousVoicing.length === 0) return base;

  const candidates = candidateVoicings(parsed, opt);
  candidates.push(base); // always consider the plain root-position voicing

  let bestVoicing = base;
  let bestCost = Infinity;
  for (const cand of candidates) {
    const sorted = dedupeSorted(cand);
    const c = voicingCost(sorted, previousVoicing, opt);
    if (c < bestCost) {
      bestCost = c;
      bestVoicing = sorted;
    }
  }

  // Re-apply the slash bass below the chosen voicing, if any.
  if (parsed.bassPitchClass != null) {
    const bassOctaveStart = opt.low - 12;
    let bassMidi = bassOctaveStart + (((parsed.bassPitchClass % 12) + 12) % 12);
    while (bassMidi >= bestVoicing[0]) bassMidi -= 12;
    if (bassMidi >= 0) bestVoicing = dedupeSorted([clampMidi(bassMidi), ...bestVoicing]);
  }

  return bestVoicing;
}

/* ------------------------------------------------------------------ *
 * 8b. Functional voicing helpers — voicing-level extensions/open voicing
 *     and diatonic added-harmony voices (Harmony Singer 2 style).
 *     All are opt-gated so the default chord voicing is unchanged.
 * ------------------------------------------------------------------ */

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

/** Parse a key string ("C:maj" / "A:min" / "C" / "Am") -> {tonicPc, mode}. */
function parseKeyString(key) {
  if (!key || typeof key !== "string") return { tonicPc: 0, mode: "maj" };
  const s = key.trim();
  const colon = s.indexOf(":");
  let rootStr = s;
  let mode = "maj";
  if (colon !== -1) {
    rootStr = s.slice(0, colon);
    mode = s.slice(colon + 1).toLowerCase().indexOf("min") === 0 ? "min" : "maj";
  } else if (/^[A-G][#bx]*m$/.test(s)) {
    rootStr = s.slice(0, -1);
    mode = "min";
  }
  const pr = parseRoot(rootStr);
  return { tonicPc: pr ? pr.pitchClass : 0, mode };
}

/** Scale pitch classes for a key (natural minor / major). */
function scaleForKey(key) {
  const { tonicPc, mode } = parseKeyString(key);
  const ivs = mode === "min" ? NATURAL_MINOR_SCALE : MAJOR_SCALE;
  return ivs.map((i) => (tonicPc + i) % 12);
}

/**
 * The MIDI note `steps` diatonic scale-degrees from `refNote` within `key`
 * (+2 = a 3rd above, +4 = a 5th above, -3 = a 4th below, -5 = a 6th below).
 * Snaps refNote to the nearest scale tone; returns null if out of 0..127.
 */
function diatonicHarmony(refNote, key, steps) {
  const scalePcs = scaleForKey(key);
  const inScale = (m) => scalePcs.indexOf((((m % 12) + 12) % 12)) !== -1;
  const ladder = [];
  for (let m = Math.max(0, refNote - 24); m <= Math.min(127, refNote + 24); m++) {
    if (inScale(m)) ladder.push(m);
  }
  if (!ladder.length) return null;
  let idx = 0;
  let bestd = Infinity;
  for (let i = 0; i < ladder.length; i++) {
    const d = Math.abs(ladder[i] - refNote);
    if (d < bestd) {
      bestd = d;
      idx = i;
    }
  }
  const ti = idx + steps;
  if (ti < 0 || ti >= ladder.length) return null;
  return ladder[ti];
}

/**
 * Add diatonic harmony voice(s) above/below the top note of a voicing, at the
 * distances selected by the Voice-Distance dial (opt.voiceDistanceSteps).
 */
function addHarmonyVoices(notes, opt) {
  const steps = opt && opt.voiceDistanceSteps;
  if (!notes.length || !Array.isArray(steps) || !steps.length) return notes;
  const key = (opt && opt.currentKey) || "C:maj";
  const top = notes[notes.length - 1];
  const extra = [];
  for (const s of steps) {
    const h = diatonicHarmony(top, key, s);
    if (h != null) extra.push(h);
  }
  return dedupeSorted(notes.concat(extra));
}

/** Drop-2 open voicing: drop the 2nd-from-top voice an octave (>=3 notes). */
function applyDrop2(notes) {
  if (!notes || notes.length < 3) return notes;
  const s = notes.slice().sort((a, b) => a - b);
  const i = s.length - 2;
  s[i] = clampMidi(s[i] - 12);
  return dedupeSorted(s);
}

/* ------------------------------------------------------------------ *
 * 9. High-level convenience API used by the Node bridge
 * ------------------------------------------------------------------ */

/**
 * Turn a raw chord symbol into a MIDI note list.
 *
 * @param {string} raw            chord symbol (any supported dialect)
 * @param {object} options        { registerCenter, low, high, voiceLeadingEnabled }
 * @param {number[]|null} prevVoicing  previous voicing for voice-leading
 * @returns {{
 *   normalizedSymbol, parsed, notes:number[],
 *   isNoChord:boolean, error:{code,detail}|null
 * }}
 */
function chordToNotes(raw, options, prevVoicing) {
  const opt = options || {};
  let parsed;
  try {
    parsed = parseChord(raw);
  } catch (e) {
    return {
      normalizedSymbol: normalizeSymbol(raw),
      parsed: null,
      notes: [],
      isNoChord: false,
      error: { code: "parser_exception", detail: String((e && e.message) || e) },
    };
  }

  if (parsed.error) {
    return {
      normalizedSymbol: parsed.normalizedSymbol,
      parsed,
      notes: [],
      isNoChord: false,
      error: parsed.error,
    };
  }

  if (parsed.isNoChord) {
    return {
      normalizedSymbol: parsed.normalizedSymbol,
      parsed,
      notes: [],
      isNoChord: true,
      error: null,
    };
  }

  // Resolve the final quality/intervals ONCE (this is where the colour knobs
  // act), then voice that fixed shape so voice-leading stays deterministic.
  const color = colorChord(parsed, opt);
  const rootPc = parsed.rootPitchClass;

  // Voicing-dial extensions (9/13, …) appended above the coloured chord.
  let ivs = color.intervals.slice();
  if (Array.isArray(opt.extensions) && opt.extensions.length) {
    for (const e of opt.extensions) if (ivs.indexOf(e) === -1) ivs.push(e);
  }

  const coloredParsed = Object.assign({}, parsed, {
    intervals: ivs,
    pitchClasses: ivs.map((iv) => (((rootPc + iv) % 12) + 12) % 12),
  });
  // The colour step already produced the exact intervals to play, so bypass
  // the triad reduction inside the voicer.
  const voiceOpt = Object.assign({}, opt, { triadsOnly: false });

  let notes =
    voiceOpt.voiceLeadingEnabled && prevVoicing && prevVoicing.length
      ? voiceLead(coloredParsed, prevVoicing, voiceOpt)
      : voiceChord(coloredParsed, voiceOpt);

  // Voicing dial (advanced): open the chord with a drop-2 transform.
  if (opt.drop2) notes = applyDrop2(notes);
  // Voice-Distance dial: add diatonic harmony voice(s) above/below the top.
  notes = addHarmonyVoices(notes, opt);

  return {
    normalizedSymbol: parsed.normalizedSymbol,
    parsed,
    notes,
    isNoChord: false,
    error: null,
    // What was actually voiced.
    triadQuality: color.quality,
    playedIntervals: ivs.slice(),
    seventh: color.seventh,
  };
}

/* ------------------------------------------------------------------ */

module.exports = {
  NOTE_BASE,
  QUALITIES,
  MAJOR_TRIAD,
  MINOR_TRIAD,
  DEFAULT_VOICING_OPTIONS,
  normalizeSymbol,
  isNoChord,
  parseRoot,
  canonicalizeQuality,
  lookupQuality,
  parseChord,
  triadIntervals,
  effectiveIntervals,
  colorChord,
  voiceChord,
  voiceLead,
  candidateVoicings,
  chordToNotes,
  scaleForKey,
  parseKeyString,
  diatonicHarmony,
  addHarmonyVoices,
  applyDrop2,
};
