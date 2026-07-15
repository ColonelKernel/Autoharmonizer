"use strict";

const assert = require("assert");
const parser = require("./chord_parser.js");
const guard = require("./voicing_guard_v4.js");

assert.strictEqual(guard.clampRegisterCenter(60), 60);
assert.strictEqual(guard.clampRegisterCenter(-999), guard.MIN_REGISTER_CENTER);
assert.strictEqual(guard.clampRegisterCenter(999), guard.MAX_REGISTER_CENTER);
assert.strictEqual(guard.clampRegisterCenter("bad", 72), 72);

assert.deepStrictEqual(guard.registerWindow(60), {
  registerCenter: 60,
  low: 48,
  high: 72,
});
assert.deepStrictEqual(guard.registerWindow(999), {
  registerCenter: guard.MAX_REGISTER_CENTER,
  low: guard.MAX_REGISTER_CENTER - 12,
  high: guard.MAX_REGISTER_CENTER + 12,
});

assert.deepStrictEqual(
  guard.normalizeMidiNotes([60.2, 60, 64, 127, 140, -4, NaN, "67"]),
  [0, 60, 64, 67, 127]
);

const major = parser.parseChord("C:maj");
const power = parser.parseChord("C5");
const silence = parser.parseChord("N.C.");
assert.strictEqual(guard.minimumVoiceCount(major), 3);
assert.strictEqual(guard.minimumVoiceCount(power), 2);
assert.strictEqual(guard.minimumVoiceCount(silence), 0);
assert.strictEqual(guard.needsRepair([127], major), true);
assert.strictEqual(guard.needsRepair([48, 52, 55], major), false);
assert.strictEqual(guard.needsRepair([48, 55], power), false);

// Every rich planner quality remains at least a triad throughout the supported
// bridge register range. This catches future per-note saturation regressions.
const qualities = [
  "maj", "min", "maj7", "min7", "7", "hdim7", "dim7", "6/9",
  "9", "maj9", "min9", "11", "min11", "13", "maj13", "min13",
  "7b9", "7#9", "7#11", "7b13", "13#11", "maj7#11",
];
for (const center of [guard.MIN_REGISTER_CENTER, 60, guard.MAX_REGISTER_CENTER]) {
  const window = guard.registerWindow(center);
  for (const quality of qualities) {
    const result = parser.chordToNotes(
      "B:" + quality,
      Object.assign({ triadsOnly: false, voiceLeadingEnabled: false }, window),
      null
    );
    assert.ifError(result.error);
    assert.ok(
      result.notes.length >= guard.minimumVoiceCount(result.parsed),
      `${quality} at register ${center} collapsed to [${result.notes}]`
    );
  }
}

console.log("voicing_guard_v4 tests: PASS");
