/**
 * performance_map_v4.test.js — assertions for protocol-v4 device mappings.
 * Run with:  node performance_map_v4.test.js
 * Exits non-zero if any assertion fails. No external test framework.
 */

"use strict";

const M = require("./performance_map_v4.js");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, extra) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(name + (extra ? "  -> " + extra : ""));
  }
}
function eqArr(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}

/* --- Phrase length ------------------------------------------------------ */
check("PHRASE_LENGTHS is 2/4/8/16", eqArr(M.PHRASE_LENGTHS, [2, 4, 8, 16]));
check("barsFromDial 0 -> 2", M.barsFromDial(0) === 2);
check("barsFromDial 1 -> 16", M.barsFromDial(1) === 16);
check("barsFromDial 0.5 -> 4 or 8", [4, 8].indexOf(M.barsFromDial(0.5)) !== -1, M.barsFromDial(0.5));
check("barsFromDial 0.34 -> 4", M.barsFromDial(0.34) === 4, M.barsFromDial(0.34));
check("barsFromDial clamps >1", M.barsFromDial(5) === 16);
check("barsFromDial NaN -> 2", M.barsFromDial("x") === 2);
check("barsFromIndex 0 -> 2", M.barsFromIndex(0) === 2);
check("barsFromIndex 1 -> 4", M.barsFromIndex(1) === 4);
check("barsFromIndex 2 -> 8", M.barsFromIndex(2) === 8);
check("barsFromIndex 3 -> 16", M.barsFromIndex(3) === 16);
check("barsFromIndex clamps 9 -> 16", M.barsFromIndex(9) === 16);
check("barsFromIndex NaN -> 2", M.barsFromIndex("x") === 2);
check("modelFromIndex 0 -> markov", M.modelFromIndex(0) === "markov");
check("modelFromIndex 2 -> lstm", M.modelFromIndex(2) === "lstm");
check("modelFromIndex clamps -1 -> markov", M.modelFromIndex(-1) === "markov");
check("modelFromIndex 3 -> ngram", M.modelFromIndex(3) === "ngram");
check("modelFromIndex 4 -> phrase (the sequence engine)", M.modelFromIndex(4) === "phrase");
check("modelFromIndex clamps 9 -> phrase", M.modelFromIndex(9) === "phrase");
check("MODEL_TAB includes ngram before phrase", eqArr(M.MODEL_TAB, ["markov", "rnn", "lstm", "ngram", "phrase"]));
// 'phrase' selects a different ENGINE (/phrase/request), not a registry model.
// Sending it to /control/model would be an error, so the dial must never yield it.
check("modelFromDial never yields phrase", [0, 0.25, 0.5, 0.75, 1].every((v) => M.modelFromDial(v) !== "phrase"));
check("MODEL_LIST excludes phrase", M.MODEL_LIST.indexOf("phrase") === -1);

/* --- Phrase scheduling (beats -> transport ticks) ----------------------- */
{
  // A real 4-bar phrase from the engine: I - vi - ii - V - ii - V - I.
  const plan = [
    { chord: "C:maj7", durBeats: 2 }, { chord: "A:min7", durBeats: 2 },
    { chord: "D:min7", durBeats: 2 }, { chord: "G:7", durBeats: 2 },
    { chord: "D:min7", durBeats: 2 }, { chord: "G:7", durBeats: 2 },
    { chord: "C:maj7", durBeats: 4 },
  ];
  const s = M.phraseSchedule(plan, 4);
  check("straight: 4 bars -> 16 ticks", s.totalTicks === 16);
  check("straight: chords land every 2 ticks", [0, 2, 4, 6, 8, 10, 12].every((t) => s.schedule.has(t)));
  check("straight: nothing on odd ticks", ![1, 3, 5].some((t) => s.schedule.has(t)));
  check("straight: cadence chord at tick 12", s.schedule.get(12) === "C:maj7");

  const t = M.phraseSchedule(plan, 6);
  check("triplet: 4 bars -> 24 ticks", t.totalTicks === 24);
  check("triplet: every chord still scheduled (no tick collisions)", t.schedule.size === plan.length);
  check("triplet: first chord on tick 0", t.schedule.get(0) === "C:maj7");
  check("triplet: 2-beat chords land 3 ticks apart", t.schedule.has(3) && t.schedule.has(6));

  // Rounding hazard: 1-beat chords sit on 1.5-tick boundaries under triplet.
  const ones = [0, 1, 2, 3].map((i) => ({ chord: `c${i}`, durBeats: 1 }));
  const r = M.phraseSchedule(ones, 6);
  check("triplet: 1-beat chords never collide on a tick", r.schedule.size === 4);
  check("triplet: 1-beat chords stay ordered", [...r.schedule.keys()].every((k, i, a) => i === 0 || k > a[i - 1]));

  check("empty plan -> 1 tick, no chords", M.phraseSchedule([], 4).totalTicks === 1);
  check("bad durations default to 1 beat", M.phraseSchedule([{ chord: "X", durBeats: 0 }], 4).totalTicks === 1);
  check("bad ticksPerBar falls back to 4", M.phraseSchedule(plan, 0).totalTicks === 16);

  const fractional = M.phraseSchedule([
    { chord: "C:maj7", durBeats: 0.5 },
    { chord: "F:maj7", durBeats: 0.5 },
    { chord: "G:7", durBeats: 1 },
  ], 8);
  check("fractional durations are retained on the eighth grid", fractional.totalTicks === 4);
  check("half-beat phrase changes land on adjacent ticks", [...fractional.schedule.keys()].join(",") === "0,1,2");

  const sparse = M.phraseSchedule([{ chord: "C:maj7", durBeats: 4 }], 8, "straight", 1);
  const dense = M.phraseSchedule([{ chord: "C:maj7", durBeats: 4 }], 8, "straight", 3);
  check("Phrase Rhythm 1 attacks once per bar", sparse.schedule.size === 1);
  check("Phrase Rhythm 3 retriggers four full chords", dense.schedule.size === 4);
  check("Phrase retriggers copy chord symbols, never single-note events",
    [...dense.schedule.values()].every((chord) => chord === "C:maj7"));

  const syncopated = M.phraseSchedule(plan, 8, "tresillo", 3);
  check("tresillo keeps four-bar phrase length", syncopated.totalTicks === 32);
  check("tresillo creates eighth-note offbeats", [...syncopated.schedule.keys()].some((tick) => tick % 2 === 1));
  check("tresillo preserves final downbeat cadence", syncopated.schedule.get(24) === "C:maj7");
  check("tresillo never loses a harmonic event", syncopated.schedule.size >= plan.length);
}

/* --- Rhythm density and Feel ------------------------------------------- */
check("legacy rhythm IDs are stable", Object.keys(M.RHYTHM_TEMPLATES).join(",") === "1,2,3,4,5,6,7");
check("rhythm dial order stays sparse -> dense", eqArr(M.RHYTHM_ORDER, [7, 1, 2, 4, 6, 5, 3]));
check("rhythm dial far left -> two-bar hold", M.rhythmTemplateFromDial(0) === 7);
check("rhythm dial far right -> quarters", M.rhythmTemplateFromDial(1) === 3);
check("Feel choices match the v4 panel", eqArr(M.FEELS,
  ["straight", "push", "tresillo", "clave3-2", "clave2-3", "upbeats", "triplet"]));
check("feel index 0 -> straight", M.feelFromIndex(0) === "straight");
check("feel index 6 -> triplet", M.feelFromIndex(6) === "triplet");
check("invalid feel falls back to straight", M.normalizeFeel("wonky") === "straight");
check("straight quarters use 0/2/4/6 on eighth grid", (() => {
  const p = M.onsetTicksForFeel("straight", 8, 3);
  return p.spanTicks === 8 && eqArr(p.onsets, [0, 2, 4, 6]);
})());
check("push has late-bar anticipations", (() => {
  const p = M.onsetTicksForFeel("push", 8, 3);
  return p.spanTicks === 16 && p.onsets.indexOf(7) !== -1 && p.onsets.indexOf(15) !== -1;
})());
check("tresillo is 0/3/6 on eighth grid", eqArr(M.onsetTicksForFeel("tresillo", 8, 3).onsets, [0, 3, 6]));
check("clave 3-2 spans two bars", M.onsetTicksForFeel("clave3-2", 8, 3).spanTicks === 16);
check("clave 2-3 spans two bars", M.onsetTicksForFeel("clave2-3", 8, 3).spanTicks === 16);
check("upbeats include every eighth-and", eqArr(M.onsetTicksForFeel("upbeats", 8, 3).onsets, [0, 1, 3, 5, 7]));
check("triplet feel is 0/2/4 on six-tick grid", eqArr(M.onsetTicksForFeel("triplet", 6, 3).onsets, [0, 2, 4]));
check("isFeelOnset repeats the two-bar clave", M.isFeelOnset("clave3-2", 16, 8, 3));
check("isFeelOnset rejects non-pattern tick", !M.isFeelOnset("tresillo", 2, 8, 3));

/* --- Phrase mode -------------------------------------------------------- */
check("modeFromValue 0 -> loop", M.modeFromValue(0) === "loop");
check("modeFromValue 1 -> regen", M.modeFromValue(1) === "regen");
check("modeFromValue 2 -> oneshot", M.modeFromValue(2) === "oneshot");
check("modeFromValue 'regen' -> regen", M.modeFromValue("regen") === "regen");
check("modeFromValue bad -> loop", M.modeFromValue("nope") === "loop");
check("nextMode loop -> regen", M.nextMode("loop") === "regen");
check("nextMode oneshot -> loop (wrap)", M.nextMode("oneshot") === "loop");

/* --- Phrase capture / re-seed helpers ----------------------------------- */
check("lastPhraseChord picks highest beat",
  M.lastPhraseChord([[0, "C:maj"], [4, "G:7"], [2, "A:min"]], "X") === "G:7");
check("lastPhraseChord empty -> fallback",
  M.lastPhraseChord([], "C:maj") === "C:maj");
check("lastPhraseChord null entries -> fallback",
  M.lastPhraseChord(null, "F:maj") === "F:maj");
check("lastPhraseChord skips empty chord",
  M.lastPhraseChord([[0, "C:maj"], [4, ""]], "X") === "C:maj");
check("captureFallbackChord prefers pending",
  M.captureFallbackChord("G:7", "A:min", "C:maj") === "G:7");
check("captureFallbackChord sustains last when no reply",
  M.captureFallbackChord(null, "A:min", "C:maj") === "A:min");
check("captureFallbackChord falls to seed when nothing sounded",
  M.captureFallbackChord(null, null, "C:maj") === "C:maj");

/* --- Program Change decode ---------------------------------------------- */
check("pgm 0 -> playtoggle", M.decodePgm(0).action === "playtoggle");
check("pgm 1 -> reroll", M.decodePgm(1).action === "reroll");
check("pgm 2 -> holdtoggle", M.decodePgm(2).action === "holdtoggle");
check("pgm 3 -> modecycle", M.decodePgm(3).action === "modecycle");
check("pgm 4 -> length 2 (PHRASE_LENGTHS[0])", M.decodePgm(4).action === "length" && M.decodePgm(4).arg === 2);
check("pgm 5 -> length 4", M.decodePgm(5).arg === 4);
check("pgm 6 -> length 8", M.decodePgm(6).arg === 8);
check("pgm 7 -> length 16 (PHRASE_LENGTHS[3])", M.decodePgm(7).arg === 16);
check("pgm pads track PHRASE_LENGTHS", [4, 5, 6, 7].every((p, i) => M.decodePgm(p).arg === M.PHRASE_LENGTHS[i]));
check("pgm 16 -> keyroot 0", M.decodePgm(16).action === "keyroot" && M.decodePgm(16).arg === 0);
check("pgm 27 -> keyroot 11", M.decodePgm(27).arg === 11);
check("pgm 28 -> keymode maj", M.decodePgm(28).action === "keymode" && M.decodePgm(28).arg === "maj");
check("pgm 29 -> keymode min", M.decodePgm(29).arg === "min");
check("pgm 99 -> none", M.decodePgm(99).action === "none");

/* --- CC -> param -------------------------------------------------------- */
check("cc 1 127 -> adventure 1.0", (() => { const r = M.ccToParam(1, 127); return r && r.param === "adventure" && Math.abs(r.value - 1) < 1e-6; })());
check("cc 1 0 -> adventure 0", (() => { const r = M.ccToParam(1, 0); return r && r.value === 0; })());
check("cc 1 64 -> adventure ~0.5", (() => { const r = M.ccToParam(1, 64); return r && Math.abs(r.value - 64 / 127) < 1e-6; })());
check("cc unmapped -> null", M.ccToParam(74, 100) === null);

/* --- Voicing level bands ------------------------------------------------ */
const vb0 = M.voicingLevelBands(0.0);
check("voicing 0 preserves backend chord, no VL", vb0.triadsOnly === false && vb0.voiceLeading === false && eqArr(vb0.extensions, []));
const vb3 = M.voicingLevelBands(0.3);
check("voicing 0.3 preserves backend chord + VL", vb3.triadsOnly === false && vb3.voiceLeading === true);
const vb5 = M.voicingLevelBands(0.55);
check("voicing 0.55 -> 7ths (triadsOnly false)", vb5.triadsOnly === false && eqArr(vb5.extensions, []));
const vb1 = M.voicingLevelBands(1.0);
check("voicing 1.0 -> extensions 9+13, drop2, wide spread", eqArr(vb1.extensions, [14, 21]) && vb1.drop2 === true && vb1.spreadCap >= 32);
check("voicing spreadCap monotonic-ish", M.voicingLevelBands(1.0).spreadCap >= M.voicingLevelBands(0.0).spreadCap);

/* --- Voice-distance positions ------------------------------------------- */
check("vd 0 -> off", M.voiceDistancePosition(0).name === "off" && eqArr(M.voiceDistancePosition(0).steps, []));
check("vd 1 -> last position", M.voiceDistancePosition(1).name === "High+Low");
check("vd has a +2 (3rd above) somewhere", M.VOICE_DISTANCE_POSITIONS.some((p) => eqArr(p.steps, [2])));
check("vd has a -3 (4th below) somewhere", M.VOICE_DISTANCE_POSITIONS.some((p) => eqArr(p.steps, [-3])));
check("vd 9 positions total (off + 8)", M.VOICE_DISTANCE_POSITIONS.length === 9);

/* --- List selectors (Seed / Key root / Model) --------------------------- */
check("seedFromDial 0 -> C:maj", M.seedFromDial(0) === "C:maj", M.seedFromDial(0));
check("seedFromDial 1 -> last seed", M.seedFromDial(1) === M.SEED_LIST[M.SEED_LIST.length - 1]);
check("seedFromDial spans the whole list", (() => {
  const seen = new Set();
  for (let i = 0; i <= 100; i++) seen.add(M.seedFromDial(i / 100));
  return seen.size === M.SEED_LIST.length;
})(), "not every seed reachable");
check("every seed is Root:quality", M.SEED_LIST.every((s) => /^[A-G][b#]?:[a-z0-9]+$/.test(s)));
check("keyRootFromDial 0 -> 0 (C)", M.keyRootFromDial(0) === 0);
check("keyRootFromDial 1 -> 11 (B)", M.keyRootFromDial(1) === 11);
check("keyRootFromDial in 0..11", [0, 0.25, 0.5, 0.75, 1].every((v) => {
  const r = M.keyRootFromDial(v);
  return Number.isInteger(r) && r >= 0 && r <= 11;
}));
check("12 key roots, C first", M.KEY_ROOTS.length === 12 && M.KEY_ROOTS[0] === "C");
check("modelFromDial 0 -> markov", M.modelFromDial(0) === "markov");
check("modelFromDial 1 -> ngram", M.modelFromDial(1) === "ngram", M.modelFromDial(1));
check("model list includes ngram", eqArr(M.MODEL_LIST, ["markov", "rnn", "lstm", "ngram"]));
check("model dial reaches every registry model", (() => {
  const seen = new Set();
  for (let i = 0; i <= 100; i++) seen.add(M.modelFromDial(i / 100));
  return M.MODEL_LIST.every((name) => seen.has(name));
})());
check("pickFromList clamps out-of-range", M.pickFromList(["a", "b"], 5) === "b" && M.pickFromList(["a", "b"], -5) === "a");

/* ------------------------------------------------------------------ */
console.log("");
console.log("performance_map_v4 tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
} else {
  console.log("ALL PASS");
  process.exit(0);
}
