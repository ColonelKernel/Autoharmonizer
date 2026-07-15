/**
 * voicing_guard_v4.js — small pure helpers that keep v4 chord voicings safe.
 *
 * MIDI pitches are clamped to 0..127 by the parser.  If an unconstrained
 * register pushes a whole chord above that range, several distinct voices can
 * collapse to pitch 127 and then be deduplicated into a single note.  The Max
 * bridge uses this module to constrain its register window and to detect any
 * unexpectedly thin result before it reaches MIDI.
 */

"use strict";

const DEFAULT_REGISTER_CENTER = 60;
// These bounds leave room for slash basses below and 13ths / added harmony
// above while retaining a useful six-octave performance range.
const MIN_REGISTER_CENTER = 36;
const MAX_REGISTER_CENTER = 96;

function finiteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampRegisterCenter(value, fallback) {
  const safeFallback = finiteNumber(fallback, DEFAULT_REGISTER_CENTER);
  const rounded = Math.round(finiteNumber(value, safeFallback));
  return Math.max(MIN_REGISTER_CENTER, Math.min(MAX_REGISTER_CENTER, rounded));
}

function registerWindow(value, fallback) {
  const registerCenter = clampRegisterCenter(value, fallback);
  return {
    registerCenter,
    low: registerCenter - 12,
    high: registerCenter + 12,
  };
}

function normalizeMidiNotes(notes) {
  if (!Array.isArray(notes)) return [];
  const normalized = [];
  for (const value of notes) {
    const note = Number(value);
    if (!Number.isFinite(note)) continue;
    normalized.push(Math.max(0, Math.min(127, Math.round(note))));
  }
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

/** Minimum audible voice count implied by a parsed chord.
 * Power chords legitimately contain two pitch classes; ordinary triads and
 * richer harmony require at least three. */
function minimumVoiceCount(parsed) {
  if (!parsed || parsed.error || parsed.isNoChord) return 0;
  const intervals = Array.isArray(parsed.intervals) ? parsed.intervals : [];
  const pitchClasses = new Set(
    intervals
      .filter((value) => Number.isFinite(Number(value)))
      .map((value) => ((Math.round(Number(value)) % 12) + 12) % 12)
  );
  if (pitchClasses.size === 0) return 0;
  return Math.min(3, pitchClasses.size);
}

function needsRepair(notes, parsed) {
  return normalizeMidiNotes(notes).length < minimumVoiceCount(parsed);
}

module.exports = {
  DEFAULT_REGISTER_CENTER,
  MIN_REGISTER_CENTER,
  MAX_REGISTER_CENTER,
  clampRegisterCenter,
  registerWindow,
  normalizeMidiNotes,
  minimumVoiceCount,
  needsRepair,
};
