/**
 * performance_map.js — pure mapping tables for the performable device.
 *
 * No `max-api` dependency (like chord_parser.js), so it runs under plain node
 * and is unit-tested by performance_map.test.js. Centralizes every "dial/pad
 * value -> meaning" decision so the MPK Mini Plus mapping lives in ONE place:
 *
 *   - barsFromDial(v)        Phrase Length dial 0..1 -> stepped bars
 *   - modeFromValue / nextMode / MODES   Phrase Mode
 *   - decodePgm(n)           MPK pad Program Change -> action
 *   - ccToParam(num, val)    MPK CC (e.g. joystick mod) -> {param, value}
 *   - voicingLevelBands(v)   Voicing dial 0..1 -> voicing option flags
 *   - voiceDistancePosition(v)  Voice-Distance dial 0..1 -> harmony steps
 */

"use strict";

function clamp01(v) {
  v = Number(v);
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* --- Phrase length ------------------------------------------------------ */
// Stepped phrase lengths, short->long. A 0..1 dial lands on the nearest step.
// Performance-first: 2- and 4-bar loops audition in seconds; 8/16 cover song
// sections. Phrase length is a DEVICE parameter (how many bars to capture
// before looping) — the models know nothing about bars, so changing this
// never touches the models.
const PHRASE_LENGTHS = [2, 4, 8, 16];
function barsFromDial(v) {
  const idx = Math.round(clamp01(v) * (PHRASE_LENGTHS.length - 1));
  return PHRASE_LENGTHS[idx];
}
// Direct index selection (live.tab sends the item INDEX, not a 0..1 dial value).
function pickIndex(list, i) {
  i = Math.round(Number(i));
  if (!Number.isFinite(i)) i = 0;
  return list[Math.max(0, Math.min(list.length - 1, i))];
}
function barsFromIndex(i) { return pickIndex(PHRASE_LENGTHS, i); }

/* --- List selection from a 0..1 dial (Seed / Key root / Model) ---------- *
 * Replaces free typing: a normalized live.dial scrolls a fixed list, and the
 * chosen item is shown in an on-panel readout. Same 0..1 idiom as barsFromDial,
 * so the dials render exactly like the proven ones and stay MPK-knob-mappable.  */
function pickFromList(list, v) {
  const idx = Math.round(clamp01(v) * (list.length - 1));
  return list[Math.max(0, Math.min(list.length - 1, idx))];
}

// Curated seed chords: common triads + the dominant/jazz shapes that make good
// phrase starting points. Index 0 (dial fully left) = C:maj.
const SEED_LIST = [
  "C:maj", "A:min", "G:maj", "F:maj", "D:min", "E:min", "G:7", "D:min7",
  "A:min7", "C:maj7", "F:maj7", "E:min7", "E:7", "A:7", "D:7", "B:hdim7",
];
function seedFromDial(v) { return pickFromList(SEED_LIST, v); }

// Key ROOT selector (12 chromatic roots, canonical spellings = pitch-class order).
// Mode (maj/min) is a separate toggle; keyRootFromDial returns the pitch class 0..11.
const KEY_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
function keyRootFromDial(v) { return Math.round(clamp01(v) * (KEY_ROOTS.length - 1)); }

// Generative models the Python REGISTRY can switch between (/control/model).
const MODEL_LIST = ["markov", "rnn", "lstm"];
function modelFromDial(v) { return pickFromList(MODEL_LIST, v); }

// What the Model tab offers. "phrase" is NOT a registry model: it selects a
// different ENGINE that requests a whole N-bar phrase (with its own generated
// harmonic rhythm) over /phrase/request. Sending it to /control/model would be
// an error, so it lives only in the tab list.
const MODEL_TAB = [...MODEL_LIST, "phrase"];
function modelFromIndex(i) { return pickIndex(MODEL_TAB, i); }

/* --- Phrase capture / re-seed helpers ----------------------------------- *
 * Pure decisions used by the auto-player's capture loop, kept here so they are
 * unit-testable without max-api.
 *
 *   lastPhraseChord(entries, fallback)  the chord at the highest beat in a
 *       captured phrase (Map entries as [beat, chord] pairs) — the last chord
 *       the loop actually sounded. Used to re-seed a fresh regen/recapture from
 *       where the previous phrase ended (instead of a stale `pending`).
 *   captureFallbackChord(pending, lastSounded, seed)  which chord a capture slot
 *       should sound when its model reply hasn't arrived yet: prefer the fresh
 *       reply, else SUSTAIN the last sounded chord, else fall back to the seed
 *       (never snap to the seed mid-phrase just because a reply is late).       */
function lastPhraseChord(entries, fallback) {
  let best = null;
  let bestBeat = -Infinity;
  for (const pair of entries || []) {
    const beat = Number(pair && pair[0]);
    const chord = pair && pair[1];
    if (Number.isFinite(beat) && beat >= bestBeat && chord) {
      bestBeat = beat;
      best = chord;
    }
  }
  return best || fallback;
}

function captureFallbackChord(pending, lastSounded, seed) {
  return pending || lastSounded || seed;
}

/* --- Phrase scheduling -------------------------------------------------- *
 * The phrase engine returns [{chord, durBeats}, ...] where a bar is 4 BEATS.
 * The transport ticks `ticksPerBar` times per bar (4 straight, 6 in triplet
 * mode), so a beat offset maps to tick = round(beat * ticksPerBar / 4).
 *
 * Rounding is safe: consecutive beats differ by >= 1 tick after rounding for
 * any ticksPerBar >= 4, so two chords can never collide on one tick. In
 * triplet mode a 1-beat chord lands on a 1.5-tick boundary and is rounded to
 * the nearest tick — the reason the model's 1-beat durations (only ~4% of the
 * corpus) shimmer slightly against a triplet grid.                            */
function phraseSchedule(plan, ticksPerBar) {
  const tpb = Number(ticksPerBar) > 0 ? Number(ticksPerBar) : 4;
  const schedule = new Map();
  let beat = 0;
  for (const step of plan || []) {
    const dur = Math.max(1, Math.round(Number(step && step.durBeats)) || 1);
    const chord = step && step.chord;
    if (chord) schedule.set(Math.round((beat * tpb) / 4), String(chord));
    beat += dur;
  }
  return { schedule, totalTicks: Math.max(1, Math.round((beat * tpb) / 4)) };
}

/* --- Phrase mode -------------------------------------------------------- */
const MODES = ["loop", "regen", "oneshot"];
function modeFromValue(v) {
  if (typeof v === "number" && Number.isFinite(v)) {
    return MODES[((Math.round(v) % MODES.length) + MODES.length) % MODES.length];
  }
  const s = String(v == null ? "" : v).toLowerCase();
  return MODES.indexOf(s) !== -1 ? s : "loop";
}
function nextMode(cur) {
  const i = MODES.indexOf(cur);
  return MODES[(i + 1) % MODES.length];
}

/* --- MPK pads: Program Change -> action --------------------------------- *
 * Pads are set to PROGRAM CHANGE in the MPK editor so they never collide with
 * the note-based key-seed path. See max/README.md for the editor setup.       */
function decodePgm(n) {
  n = Math.round(Number(n));
  switch (n) {
    case 0: return { action: "playtoggle" };
    case 1: return { action: "reroll" };
    case 2: return { action: "holdtoggle" };
    case 3: return { action: "modecycle" };
    // pads 4..7 pick a phrase length — always in step with PHRASE_LENGTHS
    case 4: case 5: case 6: case 7:
      return { action: "length", arg: PHRASE_LENGTHS[n - 4] };
    case 28: return { action: "keymode", arg: "maj" };
    case 29: return { action: "keymode", arg: "min" };
    default:
      if (n >= 16 && n <= 27) return { action: "keyroot", arg: n - 16 };
      return { action: "none" };
  }
}

/* --- MPK CC -> parameter ------------------------------------------------ *
 * CC 1 (mod, the joystick's up axis) sweeps Adventure for live spice swells.  */
const CC_MAP = { 1: "adventure" };
function ccToParam(num, val) {
  const param = CC_MAP[Math.round(Number(num))];
  if (!param) return null;
  return { param, value: clamp01(Number(val) / 127) };
}

/* --- Voicing dial: 0..1 -> voicing option flags ------------------------- *
 * A functional-harmony ladder consumed by chord_parser.chordToNotes:
 *   basic root triads -> inversions/voice-leading -> diatonic 7ths ->
 *   open/drop-2 + upper extensions (advanced). All flags default to the plain
 *   triad behaviour, so voicingLevel 0 == the pre-existing default.           */
function voicingLevelBands(v) {
  v = clamp01(v);
  if (v < 0.2) {
    return { triadsOnly: true, voiceLeading: false, extensions: [], drop2: false, spreadCap: 24 };
  }
  if (v < 0.45) {
    return { triadsOnly: true, voiceLeading: true, extensions: [], drop2: false, spreadCap: 24 };
  }
  if (v < 0.7) {
    // Voice the chord AS chosen — the blend's own jazz 7ths now sound.
    return { triadsOnly: false, voiceLeading: true, extensions: [], drop2: false, spreadCap: 26 };
  }
  if (v < 0.88) {
    return { triadsOnly: false, voiceLeading: true, extensions: [14], drop2: true, spreadCap: 32 };
  }
  return { triadsOnly: false, voiceLeading: true, extensions: [14, 21], drop2: true, spreadCap: 36 };
}

/* --- Voice-Distance dial: 0..1 -> diatonic harmony steps ---------------- *
 * Mirrors the TC-Helicon Harmony Singer 2 HARMONY knob. Steps are DIATONIC
 * scale-degree offsets from the reference (chord's top) note:
 *   3rd above = +2, 5th above = +4, 4th below = -3, 6th below = -5.           */
const VOICE_DISTANCE_POSITIONS = [
  { name: "off", steps: [] },
  { name: "High", steps: [2] },            // 3rd above
  { name: "Higher", steps: [4] },          // 5th above
  { name: "High+Higher", steps: [2, 4] },  // 3rd + 5th above
  { name: "Low", steps: [-3] },            // 4th below
  { name: "Lower", steps: [-5] },          // 6th below
  { name: "Low+Lower", steps: [-3, -5] },  // 4th + 6th below
  { name: "Higher+Lower", steps: [4, -5] },// 5th above + 6th below
  { name: "High+Low", steps: [2, -3] },    // 3rd above + 4th below
];
function voiceDistancePosition(v) {
  const idx = Math.round(clamp01(v) * (VOICE_DISTANCE_POSITIONS.length - 1));
  return VOICE_DISTANCE_POSITIONS[idx];
}

module.exports = {
  clamp01,
  pickFromList,
  SEED_LIST,
  seedFromDial,
  KEY_ROOTS,
  keyRootFromDial,
  MODEL_LIST,
  MODEL_TAB,
  modelFromDial,
  modelFromIndex,
  PHRASE_LENGTHS,
  barsFromDial,
  barsFromIndex,
  pickIndex,
  lastPhraseChord,
  captureFallbackChord,
  phraseSchedule,
  MODES,
  modeFromValue,
  nextMode,
  decodePgm,
  CC_MAP,
  ccToParam,
  voicingLevelBands,
  VOICE_DISTANCE_POSITIONS,
  voiceDistancePosition,
};
