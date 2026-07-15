/**
 * chord_parser.test.js — self-contained assertions for the chord parser.
 * Run with:  node chord_parser.test.js   (or `npm test`)
 * Exits non-zero if any assertion fails.  No external test framework.
 */

"use strict";

const P = require("./chord_parser.js");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, extra) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(name + (extra ? "  -> " + extra : ""));
  }
}

function eqArr(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}

/* ------------------------------------------------------------------ *
 * Common validity checks applied to every parsed non-error chord.
 * ------------------------------------------------------------------ */
function assertPlayable(name, parsed, expectRootPc, expectIntervals) {
  check(name + ": no throw / defined", !!parsed);
  check(name + ": no error", !parsed.error, parsed.error && JSON.stringify(parsed.error));
  if (parsed.error) return;
  if (expectRootPc != null) {
    check(name + ": root pc", parsed.rootPitchClass === expectRootPc,
      "got " + parsed.rootPitchClass + " want " + expectRootPc);
  }
  if (expectIntervals) {
    check(name + ": intervals", eqArr(parsed.intervals, expectIntervals),
      "got [" + parsed.intervals + "] want [" + expectIntervals + "]");
  }
  const notes = P.voiceChord(parsed, {});
  check(name + ": notes non-empty", notes.length > 0);
  check(name + ": notes are integers", notes.every((n) => Number.isInteger(n)));
  check(name + ": notes in 0..127", notes.every((n) => n >= 0 && n <= 127));
}

/* ------------------------------------------------------------------ *
 * Section 15 required test list
 * ------------------------------------------------------------------ */
assertPlayable("C", P.parseChord("C"), 0, [0, 4, 7]);
assertPlayable("Cm", P.parseChord("Cm"), 0, [0, 3, 7]);
assertPlayable("C7", P.parseChord("C7"), 0, [0, 4, 7, 10]);
assertPlayable("Cmaj7", P.parseChord("Cmaj7"), 0, [0, 4, 7, 11]);
assertPlayable("Cm7", P.parseChord("Cm7"), 0, [0, 3, 7, 10]);
assertPlayable("F#m7", P.parseChord("F#m7"), 6, [0, 3, 7, 10]);
assertPlayable("Bb7", P.parseChord("Bb7"), 10, [0, 4, 7, 10]);
assertPlayable("Cdim7", P.parseChord("Cdim7"), 0, [0, 3, 6, 9]);
assertPlayable("Cm7b5", P.parseChord("Cm7b5"), 0, [0, 3, 6, 10]);
assertPlayable("C9", P.parseChord("C9"), 0, [0, 4, 7, 10, 14]);
assertPlayable("Cm9", P.parseChord("Cm9"), 0, [0, 3, 7, 10, 14]);
assertPlayable("Cmaj7/G (main)", P.parseChord("Cmaj7/G"), 0, [0, 4, 7, 11]);
assertPlayable("C7b9", P.parseChord("C7b9"), 0, [0, 4, 7, 10, 13]);
assertPlayable("C7#9", P.parseChord("C7#9"), 0, [0, 4, 7, 10, 15]);
assertPlayable("Cmaj7#11", P.parseChord("Cmaj7#11"), 0, [0, 4, 7, 11, 18]);

// N.C. -> silence, no notes
{
  const nc = P.parseChord("N.C.");
  check("N.C.: isNoChord", nc.isNoChord === true);
  check("N.C.: no error", !nc.error);
  check("N.C.: empty pitch classes", eqArr(nc.pitchClasses, []));
  check("N.C.: voiceChord empty", eqArr(P.voiceChord(nc, {}), []));
}

/* ------------------------------------------------------------------ *
 * Slash chord: bass placed below the main voicing
 * ------------------------------------------------------------------ */
{
  const parsed = P.parseChord("Cmaj7/G");
  check("Cmaj7/G: bass=G", parsed.bass === "G" && parsed.bassPitchClass === 7);
  const notes = P.voiceChord(parsed, {});
  check("Cmaj7/G: bass is lowest", notes[0] < notes[1]);
  check("Cmaj7/G: bass pitch class = G (7)", notes[0] % 12 === 7);
  check("Cmaj7/G: bass below chord root C(48)", notes[0] < 48);
}
{
  const parsed = P.parseChord("Dm7/C");
  check("Dm7/C: bass=C", parsed.bass === "C" && parsed.bassPitchClass === 0);
  const notes = P.voiceChord(parsed, {});
  check("Dm7/C: bass pc = C(0)", notes[0] % 12 === 0);
}
{
  const compact = P.parseChord("C6/9");
  const colon = P.parseChord("C:6/9");
  check("C6/9: quality slash is not a bass separator",
    !compact.error && compact.quality === "6/9" && compact.bass === null);
  check("C:6/9: colon quality slash is not a bass separator",
    !colon.error && colon.quality === "6/9" && colon.bass === null);
  check("C:6/9: full intervals retained",
    eqArr(colon.intervals, [0, 4, 7, 9, 14]), "[" + colon.intervals + "]");

  const inverted = P.parseChord("C:6/9/G");
  check("C:6/9/G: true slash bass still parses",
    !inverted.error && inverted.quality === "6/9" && inverted.bass === "G");
  const voiced = P.chordToNotes(
    "C:6/9/G",
    { triadsOnly: false, voiceLeadingEnabled: false },
    null
  );
  check("C:6/9/G: full chord is playable", !voiced.error && voiced.notes.length === 6,
    "[" + voiced.notes + "]");

  const badBass = P.parseChord("C:6/9/H");
  check("C:6/9/H: invalid true slash bass is rejected",
    !!badBass.error && badBass.error.code === "invalid_root");
}

/* ------------------------------------------------------------------ *
 * PROJECT CONSTRAINT: only MAJOR or MINOR triads are sonified.
 * Default voicings are the reduced triad (root position, register C3+).
 * ------------------------------------------------------------------ */
check("Cmaj7 -> C major triad 48 52 55",
  eqArr(P.voiceChord(P.parseChord("Cmaj7"), {}), [48, 52, 55]),
  "[" + P.voiceChord(P.parseChord("Cmaj7"), {}) + "]");
check("Dm7 -> D minor triad 50 53 57",
  eqArr(P.voiceChord(P.parseChord("Dm7"), {}), [50, 53, 57]),
  "[" + P.voiceChord(P.parseChord("Dm7"), {}) + "]");
check("G7 -> G major triad 55 59 62",
  eqArr(P.voiceChord(P.parseChord("G7"), {}), [55, 59, 62]),
  "[" + P.voiceChord(P.parseChord("G7"), {}) + "]");
check("Cm7 -> C minor triad 48 51 55",
  eqArr(P.voiceChord(P.parseChord("Cm7"), {}), [48, 51, 55]),
  "[" + P.voiceChord(P.parseChord("Cm7"), {}) + "]");

// Every reduced chord is exactly a 3-note triad (no bass slash).
for (const sym of ["Cmaj7", "Dm7", "G7", "Cdim7", "Caug", "Cm7b5", "C9", "Cm13", "C7#9"]) {
  const n = P.voiceChord(P.parseChord(sym), {});
  check(sym + ": reduced to a 3-note triad", n.length === 3, "[" + n + "]");
}

// triadIntervals classifies quality by the third.
check("triad(Cmaj7) major", P.triadIntervals(P.parseChord("Cmaj7")).quality === "major");
check("triad(Dm7) minor", P.triadIntervals(P.parseChord("Dm7")).quality === "minor");
check("triad(Cdim7) minor (dim third)", P.triadIntervals(P.parseChord("Cdim7")).quality === "minor");
check("triad(Cm7b5) minor", P.triadIntervals(P.parseChord("Cm7b5")).quality === "minor");
check("triad(Caug) major", P.triadIntervals(P.parseChord("Caug")).quality === "major");
check("triad(C7#9) major (real 3rd)", P.triadIntervals(P.parseChord("C7#9")).quality === "major");
check("triad(C5 power) -> major default", P.triadIntervals(P.parseChord("C5")).quality === "major");
check("triad(Csus4) -> major default", P.triadIntervals(P.parseChord("Csus4")).quality === "major");
check("triad intervals major = [0,4,7]", eqArr(P.triadIntervals(P.parseChord("Cmaj7")).intervals, [0, 4, 7]));
check("triad intervals minor = [0,3,7]", eqArr(P.triadIntervals(P.parseChord("Am7")).intervals, [0, 3, 7]));

// The triadsOnly flag must be reversible: OFF voices the full chord.
check("triadsOnly:false -> full Cmaj7 = 48 52 55 59",
  eqArr(P.voiceChord(P.parseChord("Cmaj7"), { triadsOnly: false }), [48, 52, 55, 59]),
  "[" + P.voiceChord(P.parseChord("Cmaj7"), { triadsOnly: false }) + "]");
check("triadsOnly:false -> full G7 = 55 59 62 65",
  eqArr(P.voiceChord(P.parseChord("G7"), { triadsOnly: false }), [55, 59, 62, 65]));

/* ------------------------------------------------------------------ *
 * Enharmonic roots: C# and Db share pitch class 1 but keep metadata
 * ------------------------------------------------------------------ */
{
  const cs = P.parseChord("C#");
  const db = P.parseChord("Db");
  check("C#: pc=1", cs.rootPitchClass === 1);
  check("Db: pc=1", db.rootPitchClass === 1);
  check("C#/Db: same pitch class", cs.rootPitchClass === db.rootPitchClass);
  check("C#: label kept", cs.root === "C#");
  check("Db: label kept", db.root === "Db");
}

/* ------------------------------------------------------------------ *
 * Colon dataset notation (what the Markov service actually returns)
 * ------------------------------------------------------------------ */
assertPlayable("C:maj", P.parseChord("C:maj"), 0, [0, 4, 7]);
assertPlayable("C:min", P.parseChord("C:min"), 0, [0, 3, 7]);
assertPlayable("C:7", P.parseChord("C:7"), 0, [0, 4, 7, 10]);
assertPlayable("C:maj7", P.parseChord("C:maj7"), 0, [0, 4, 7, 11]);
assertPlayable("C:min7", P.parseChord("C:min7"), 0, [0, 3, 7, 10]);
assertPlayable("A:hdim7", P.parseChord("A:hdim7"), 9, [0, 3, 6, 10]);
assertPlayable("G:sus4", P.parseChord("G:sus4"), 7, [0, 5, 7]);
assertPlayable("Ab:maj7", P.parseChord("Ab:maj7"), 8, [0, 4, 7, 11]);
assertPlayable("F#:min7", P.parseChord("F#:min7"), 6, [0, 3, 7, 10]);
assertPlayable("Eb:aug", P.parseChord("Eb:aug"), 3, [0, 4, 8]);

/* ------------------------------------------------------------------ *
 * Extra quality coverage from spec section 8
 * ------------------------------------------------------------------ */
assertPlayable("CM (major)", P.parseChord("CM"), 0, [0, 4, 7]);
assertPlayable("C- (minor)", P.parseChord("C-"), 0, [0, 3, 7]);
assertPlayable("C5 (power)", P.parseChord("C5"), 0, [0, 7]);
assertPlayable("Cdim", P.parseChord("Cdim"), 0, [0, 3, 6]);
assertPlayable("Caug", P.parseChord("Caug"), 0, [0, 4, 8]);
assertPlayable("C+", P.parseChord("C+"), 0, [0, 4, 8]);
assertPlayable("Csus2", P.parseChord("Csus2"), 0, [0, 2, 7]);
assertPlayable("Csus4", P.parseChord("Csus4"), 0, [0, 5, 7]);
assertPlayable("C6", P.parseChord("C6"), 0, [0, 4, 7, 9]);
assertPlayable("Cm6", P.parseChord("Cm6"), 0, [0, 3, 7, 9]);
assertPlayable("CM7", P.parseChord("CM7"), 0, [0, 4, 7, 11]);
assertPlayable("CΔ7", P.parseChord("CΔ7"), 0, [0, 4, 7, 11]);
assertPlayable("CmMaj7", P.parseChord("CmMaj7"), 0, [0, 3, 7, 11]);
assertPlayable("Co7", P.parseChord("Co7"), 0, [0, 3, 6, 9]);
assertPlayable("C°7", P.parseChord("C°7"), 0, [0, 3, 6, 9]);
assertPlayable("Cø", P.parseChord("Cø"), 0, [0, 3, 6, 10]);
assertPlayable("Cø7", P.parseChord("Cø7"), 0, [0, 3, 6, 10]);
assertPlayable("Cadd9", P.parseChord("Cadd9"), 0, [0, 4, 7, 14]);
assertPlayable("Cmaj9", P.parseChord("Cmaj9"), 0, [0, 4, 7, 11, 14]);
assertPlayable("C11", P.parseChord("C11"), 0, [0, 7, 10, 14, 17]);
assertPlayable("Cm11", P.parseChord("Cm11"), 0, [0, 3, 7, 10, 14, 17]);
assertPlayable("C13", P.parseChord("C13"), 0, [0, 4, 7, 10, 14, 21]);
assertPlayable("Cm13", P.parseChord("Cm13"), 0, [0, 3, 7, 10, 14, 21]);
assertPlayable("C7b5", P.parseChord("C7b5"), 0, [0, 4, 6, 10]);
assertPlayable("C7#5", P.parseChord("C7#5"), 0, [0, 4, 8, 10]);
assertPlayable("C7#11", P.parseChord("C7#11"), 0, [0, 4, 7, 10, 18]);
assertPlayable("C7b13", P.parseChord("C7b13"), 0, [0, 4, 7, 10, 20]);
assertPlayable("C7(b9) paren", P.parseChord("C7(b9)"), 0, [0, 4, 7, 10, 13]);
assertPlayable("C7(#9) paren", P.parseChord("C7(#9)"), 0, [0, 4, 7, 10, 15]);
assertPlayable("Cmaj7(#11) paren", P.parseChord("Cmaj7(#11)"), 0, [0, 4, 7, 11, 18]);

/* ------------------------------------------------------------------ *
 * Performable colour controls (major / minor / 7th knobs)
 * ------------------------------------------------------------------ */
{
  const rng = () => 0.0; // always "hits" a probability > 0
  const rngHigh = () => 0.999; // never hits (unless prob == 1)
  const Cmaj = P.parseChord("Cmaj7"); // natural quality: major
  const Am = P.parseChord("Am7"); // natural quality: minor

  // no colour -> natural triad unchanged
  check("colour off: Cmaj7 -> major triad",
    eqArr(P.colorChord(Cmaj, {}).intervals, [0, 4, 7]));
  check("colour off: Am7 -> minor triad",
    eqArr(P.colorChord(Am, {}).intervals, [0, 3, 7]));

  // major knob forces major (even on a naturally-minor chord)
  check("colorMajor=1 forces major on Am7",
    P.colorChord(Am, { colorMajor: 1, rng }).quality === "major");
  // minor knob forces minor (even on a naturally-major chord)
  check("colorMinor=1 forces minor on Cmaj7",
    P.colorChord(Cmaj, { colorMinor: 1, rng }).quality === "minor");
  // major checked before minor when both maxed
  check("both maxed -> major wins",
    P.colorChord(Am, { colorMajor: 1, colorMinor: 1, rng }).quality === "major");

  // 7th knob adds a flat-7th: major->dom7, minor->min7
  check("color7th=1 on major -> dom7 [0,4,7,10]",
    eqArr(P.colorChord(Cmaj, { color7th: 1, rng }).intervals, [0, 4, 7, 10]));
  check("color7th=1 on minor -> min7 [0,3,7,10]",
    eqArr(P.colorChord(Am, { color7th: 1, rng }).intervals, [0, 3, 7, 10]));
  check("color7th=1 sets seventh flag", P.colorChord(Cmaj, { color7th: 1, rng }).seventh === true);
  // probability 0 never fires even when the roll is low
  check("color7th=0 never adds 7th", P.colorChord(Cmaj, { color7th: 0, rng }).seventh === false);
  check("colorMajor<roll: no force", P.colorChord(Am, { colorMajor: 0.3, rng: rngHigh }).quality === "minor");

  // chordToNotes end-to-end with colour: 7th knob on a Markov reply
  const r7 = P.chordToNotes("C:maj", { color7th: 1, voiceLeadingEnabled: false, rng }, null);
  check("chordToNotes color7th -> 4 notes (dom7)", r7.notes.length === 4 && r7.seventh === true,
    "[" + r7.notes + "]");
  check("chordToNotes color7th notes are valid MIDI",
    r7.notes.every((n) => Number.isInteger(n) && n >= 0 && n <= 127));
  // clamping: out-of-range knob values are clamped to 0..1
  check("colorMajor>1 clamps (still forces major)",
    P.colorChord(Am, { colorMajor: 5, rng }).quality === "major");
  check("negative knob clamps to 0", P.colorChord(Cmaj, { colorMajor: -3, rng }).quality === "major");
}

/* ------------------------------------------------------------------ *
 * Normalization behaviour
 * ------------------------------------------------------------------ */
check('normalize " Cmaj7 " -> Cmaj7', P.normalizeSymbol(" Cmaj7 ") === "Cmaj7");
check('normalize B♭7 -> Bb7', P.normalizeSymbol("B♭7") === "Bb7");
check('normalize F♯m7 -> F#m7', P.normalizeSymbol("F♯m7") === "F#m7");
check('normalize quoted "\\"Cmaj7\\"" -> Cmaj7', P.normalizeSymbol('"Cmaj7"') === "Cmaj7");
check("normalize newline strip", P.normalizeSymbol("Cmaj7\n") === "Cmaj7");
// B must NOT collapse to b
check("root B parsed as B natural (pc 11)", P.parseChord("B").rootPitchClass === 11);
check("Bb parsed as pc 10", P.parseChord("Bb").rootPitchClass === 10);
// M7 (major) must not become m7 (minor)
check("M7 stays major", eqArr(P.parseChord("CM7").intervals, [0, 4, 7, 11]));
check("m7 stays minor", eqArr(P.parseChord("Cm7").intervals, [0, 3, 7, 10]));

/* ------------------------------------------------------------------ *
 * Error handling — never throw, always structured error
 * ------------------------------------------------------------------ */
{
  const e1 = P.parseChord("H7banana");
  check("H7banana: has error", !!e1.error);
  check("H7banana: unsupported/invalid", !!e1.error && (e1.error.code === "invalid_root" || e1.error.code === "unsupported_chord"));
  check("H7banana: no notes", eqArr(P.voiceChord(e1, {}), []));

  const e2 = P.parseChord("C7add#15");
  check("C7add#15: has error", !!e2.error);
  check("C7add#15: unsupported_modifier", !!e2.error && e2.error.code === "unsupported_modifier");

  // chordToNotes never throws on garbage
  const r = P.chordToNotes("!!!garbage!!!", {}, null);
  check("garbage via chordToNotes: error present, no notes", !!r.error && r.notes.length === 0);
}

/* ------------------------------------------------------------------ *
 * Voice leading determinism / register sanity
 * ------------------------------------------------------------------ */
{
  const cmaj7 = P.parseChord("Cmaj7");
  const am7 = P.parseChord("Am7");
  const prev = P.voiceChord(cmaj7, {}); // 48 52 55 59
  const led = P.voiceLead(am7, prev, {});
  check("voiceLead: integers", led.every((n) => Number.isInteger(n)));
  check("voiceLead: in range-ish", led.every((n) => n >= 0 && n <= 127));
  check("voiceLead deterministic", eqArr(led, P.voiceLead(am7, prev, {})));
  // nearest voicing should not leap far from previous centre of gravity
  const avg = (a) => a.reduce((s, n) => s + n, 0) / a.length;
  check("voiceLead stays near previous register", Math.abs(avg(led) - avg(prev)) < 12,
    "prev avg " + avg(prev).toFixed(1) + " led avg " + avg(led).toFixed(1));
}

/* ------------------------------------------------------------------ *
 * chordToNotes end-to-end (what the Node bridge calls)
 * ------------------------------------------------------------------ */
{
  const r = P.chordToNotes("G:7", { voiceLeadingEnabled: false }, null);
  check("chordToNotes G:7 normalized", r.normalizedSymbol === "G:7");
  check("chordToNotes G:7 notes (major triad)", eqArr(r.notes, [55, 59, 62]), "[" + r.notes + "]");
  check("chordToNotes G:7 triadQuality major", r.triadQuality === "major");
  const dm = P.chordToNotes("D:min7", { voiceLeadingEnabled: false }, null);
  check("chordToNotes D:min7 notes (minor triad)", eqArr(dm.notes, [50, 53, 57]), "[" + dm.notes + "]");
  check("chordToNotes D:min7 triadQuality minor", dm.triadQuality === "minor");
  // colon-notation dataset qualities returned by the Markov service
  check("chordToNotes E:hdim7 -> minor triad", P.chordToNotes("E:hdim7", {}, null).triadQuality === "minor");
  check("chordToNotes G:aug -> major triad", P.chordToNotes("G:aug", {}, null).triadQuality === "major");
  const nc = P.chordToNotes("N.C.", {}, null);
  check("chordToNotes N.C. isNoChord", nc.isNoChord === true && nc.notes.length === 0);
}

/* ------------------------------------------------------------------ *
 * Voicing dial: functional-harmony ladder + diatonic added voices
 * ------------------------------------------------------------------ */
{
  // diatonicHarmony in C major: E(64) +2 steps (a 3rd above) -> G(67)
  check("diatonic 3rd above E in C = G", P.diatonicHarmony(64, "C:maj", 2) === 67,
    String(P.diatonicHarmony(64, "C:maj", 2)));
  // C(60) -3 steps (a 4th below) -> G(55)
  check("diatonic 4th below C in C = G", P.diatonicHarmony(60, "C:maj", -3) === 55,
    String(P.diatonicHarmony(60, "C:maj", -3)));
  // C(60) +4 steps (a 5th above) -> G(67)
  check("diatonic 5th above C in C = G", P.diatonicHarmony(60, "C:maj", 4) === 67,
    String(P.diatonicHarmony(60, "C:maj", 4)));
  // A minor scale contains C E G etc.; A(69) +2 -> C(72)
  check("diatonic 3rd above A in Am = C", P.diatonicHarmony(69, "A:min", 2) === 72,
    String(P.diatonicHarmony(69, "A:min", 2)));

  // addHarmonyVoices adds notes above the top
  const base = [48, 52, 55]; // C major triad
  const withHi = P.addHarmonyVoices(base, { voiceDistanceSteps: [2], currentKey: "C:maj" });
  check("addHarmonyVoices adds a note", withHi.length === base.length + 1, "[" + withHi + "]");
  check("addHarmonyVoices stays sorted", withHi.every((n, i) => i === 0 || n > withHi[i - 1]));
  check("addHarmonyVoices off = unchanged",
    eqArr(P.addHarmonyVoices(base, { voiceDistanceSteps: [] }), base));

  // drop-2 lowers the 2nd-from-top by an octave
  const dropped = P.applyDrop2([48, 52, 55, 59]); // Cmaj7 close
  check("drop2 lowers 2nd-from-top", dropped.indexOf(43) !== -1, "[" + dropped + "]");

  // Voicing ladder via chordToNotes: level 0 = plain triad, high = richer
  const lo = P.chordToNotes("C:maj7", { triadsOnly: true }, null); // basic (triad reduce)
  check("voicing basic reduces to triad (3 notes)", lo.notes.length === 3, "[" + lo.notes + "]");
  const hi = P.chordToNotes(
    "C:maj7",
    { triadsOnly: false, extensions: [14], drop2: true, spreadCap: 32 },
    null
  );
  check("voicing advanced is richer than basic", hi.notes.length > lo.notes.length,
    "hi=[" + hi.notes + "] lo=[" + lo.notes + "]");
  check("voicing advanced includes the 9th pitch-class (D=2)",
    hi.notes.some((n) => ((n % 12) + 12) % 12 === 2), "[" + hi.notes + "]");

  // Default call (no new opts) is unchanged behaviour
  const plain = P.chordToNotes("C:maj", {}, null);
  check("default voicing unchanged (C E G)", eqArr(plain.notes, [48, 52, 55]), "[" + plain.notes + "]");
}

/* ------------------------------------------------------------------ */
console.log("");
console.log("chord_parser tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
} else {
  console.log("ALL PASS");
  process.exit(0);
}
