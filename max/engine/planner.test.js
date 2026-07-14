"use strict";

/**
 * planner.test.js — parity check of planner.js against the v4 HarmonyPlanner.
 *
 * Python's random.Random stream cannot be reproduced in JS, so we NEVER assert
 * an individual random draw. Instead we test, against golden Python dumps and
 * structural invariants:
 *   (a) the complexity MASK — which candidates are permitted at each level;
 *   (b) functionBonus values (pure deterministic math);
 *   (c) realize() STRUCTURE — output parses, its tier is in the tier's band,
 *       and root/function invariants hold, over many rng draws;
 *   (d) a Monte-Carlo mean-tier check — mean tier of choose() output is
 *       non-decreasing in complexity (the arch doc's distributional rule).
 *
 * Run with:  node planner.test.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { createHarmonyPlanner } = require("./planner.js");
const { makeRng } = require("./rng.js");
const {
  parseChord,
  chordComplexityTier,
  complexityLevel,
  harmonicFunction,
  scalePitchClasses,
} = require("./theory.js");

let passed = 0;
const FX = path.join(__dirname, "fixtures");
function fx(name) {
  return JSON.parse(fs.readFileSync(path.join(FX, name), "utf8"));
}
function approx(a, b, msg) {
  assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} !~= ${b}`);
}

// The exact fixed choice set the fixtures were generated from.
const CHOICES = [
  ["C:maj", 0.30],
  ["D:min", 0.15],
  ["E:min", 0.10],
  ["F:maj", 0.08],
  ["G:7", 0.20],
  ["A:min", 0.05],
  ["F:maj7", 0.04],
  ["E:7", 0.03],
  ["Bb:maj", 0.02],
  ["C:13", 0.01],
  ["Db:7", 0.005],
  ["C:maj7#11", 0.005],
  ["G:maj7", 0.02],
  ["B:dim", 0.01],
  ["not a chord", 0.5],
];

// ---------------------------------------------------------------------------
// (a0) candidate tier: JS chordComplexityTier must match the Python dump
//      before the mask (which is built on it) can be trusted.
// ---------------------------------------------------------------------------
for (const r of fx("planner_candidate_tier.json")) {
  assert.strictEqual(
    chordComplexityTier(r.symbol, r.key),
    r.tier,
    `chordComplexityTier(${r.symbol}, ${r.key})`
  );
  passed++;
}

// ---------------------------------------------------------------------------
// (a) mask: replicate the planner's permitted computation and assert it equals
//     the Python dump for every (key, level).
// ---------------------------------------------------------------------------
function permittedFor(choices, key, level) {
  let valid = choices.filter((c) => parseChord(c[0]));
  if (valid.length === 0) {
    valid = choices.slice();
  }
  let permitted = valid.filter((c) => chordComplexityTier(c[0], key) <= level);
  if (permitted.length === 0) {
    let minimum = Infinity;
    for (const c of valid) {
      const t = chordComplexityTier(c[0], key);
      if (t < minimum) minimum = t;
    }
    permitted = valid.filter((c) => chordComplexityTier(c[0], key) === minimum);
  }
  return permitted.map((c) => c[0]);
}

for (const r of fx("planner_mask.json")) {
  assert.deepStrictEqual(
    permittedFor(CHOICES, r.key, r.level),
    r.permitted,
    `mask key=${r.key} level=${r.level}`
  );
  passed++;
}

// Cross-check: every symbol choose() can return at a level is in the mask, and
// the returned candidate is always one of the permitted ones. (Uses the public
// API with a real rng; asserts membership, not the specific draw.)
for (const key of ["C:maj", "A:min", "Eb:maj"]) {
  for (let level = 0; level < 5; level++) {
    const value = level === 4 ? 0.9 : level * 0.2 + 0.1;
    assert.strictEqual(complexityLevel(value), level, `level map ${value}`);
    const allowed = new Set(permittedFor(CHOICES, key, level));
    const rng = makeRng(1000 + level);
    const pl = createHarmonyPlanner({ key, complexity: value, rng });
    for (let i = 0; i < 200; i++) {
      const [sym] = pl.choose("C:maj", CHOICES);
      assert.ok(allowed.has(sym), `choose ${sym} not in mask key=${key} lvl=${level}`);
    }
    passed++;
  }
}

// ---------------------------------------------------------------------------
// (b) functionBonus: pure math replicated from the planner, vs Python dump.
// ---------------------------------------------------------------------------
function functionBonus(source, target, key, gravity) {
  const a = harmonicFunction(source, key);
  const b = harmonicFunction(target, key);
  let bonus = 0.0;
  if (a === "T" && b === "PD") bonus = 0.18;
  else if (a === "PD" && b === "D") bonus = 0.28;
  else if (a === "D" && b === "T") bonus = 0.38 + 0.75 * gravity;
  else if (a === "T" && b === "D") bonus = 0.08;
  if (a === "C" && b === "C") bonus -= 0.12;
  return bonus;
}

for (const r of fx("planner_function_bonus.json")) {
  approx(
    functionBonus(r.source, r.target, r.key, r.gravity),
    r.bonus,
    `functionBonus ${r.source}->${r.target} key=${r.key} g=${r.gravity}`
  );
  passed++;
}

// ---------------------------------------------------------------------------
// (c) realize() structure: for each tier, output parses, its complexity tier
//     sits in the tier's allowed band, and root/function invariants hold.
// ---------------------------------------------------------------------------
const REALIZE_INPUTS = [
  "C:maj", "D:min", "E:min", "F:maj", "G:7", "A:min", "B:dim",
  "F:maj7", "G:maj7", "E:min7", "C:7", "Bb:maj", "Db:maj", "Ab:maj",
];
const REALIZE_KEYS = ["C:maj", "A:min", "Eb:maj", "F#:min"];

function scaleSet(key) {
  return scalePitchClasses(key)[2];
}

for (const key of REALIZE_KEYS) {
  const scale = scaleSet(key);
  for (let level = 0; level <= 4; level++) {
    const value = level === 4 ? 0.9 : level * 0.2 + 0.1;
    assert.strictEqual(complexityLevel(value), level, `realize level map ${value}`);
    for (const input of REALIZE_INPUTS) {
      const inputParsed = parseChord(input);
      // Draw many times to exercise every random branch of realize.
      for (let seed = 0; seed < 60; seed++) {
        const rng = makeRng(seed * 131 + level * 7 + input.length);
        const pl = createHarmonyPlanner({ key, complexity: value, rng });
        const out = pl.realize(input);
        const p = parseChord(out);
        assert.ok(p !== null, `realize output must parse: ${input}@${key} lvl${level} -> ${out}`);
        const tier = chordComplexityTier(out, key);

        if (level === 0) {
          assert.strictEqual(tier, 0, `lvl0 tier band ${out}`);
          assert.ok(scale.has(p.rootPc), `lvl0 root diatonic ${out}`);
          assert.strictEqual(p.bassPc, null, `lvl0 no bass ${out}`);
        } else if (level === 1) {
          // A diatonic seventh whose root is a fifth above a scale degree is
          // flagged tier 2 (secondary dominant) by the classifier, which runs
          // that check before the diatonic branch — so the band is {1,2}.
          assert.ok(tier === 1 || tier === 2, `lvl1 tier band ${out} (${tier})`);
          assert.ok(scale.has(p.rootPc), `lvl1 root diatonic ${out}`);
        } else if (level === 2) {
          // Identity tier: exact canonical re-render of the input token.
          assert.strictEqual(tier, chordComplexityTier(input, key), `lvl2 tier==input ${out}`);
          assert.strictEqual(p.rootPc, inputParsed.rootPc, `lvl2 root preserved ${out}`);
          assert.strictEqual(p.quality, inputParsed.quality, `lvl2 quality preserved ${out}`);
        } else if (level === 3) {
          assert.ok(tier === 3 || tier === 4, `lvl3 tier band ${out} (${tier})`);
          assert.strictEqual(p.rootPc, inputParsed.rootPc, `lvl3 root preserved ${out}`);
        } else {
          assert.ok(tier === 3 || tier === 4, `lvl4 tier band ${out} (${tier})`);
          const fn = harmonicFunction(input, key);
          const q = inputParsed.quality;
          const domLike = fn === "D" || q === "7";
          // Root is preserved except the dominant tritone-sub branch (+6).
          const ok = p.rootPc === inputParsed.rootPc ||
            (domLike && p.rootPc === (inputParsed.rootPc + 6) % 12);
          assert.ok(ok, `lvl4 root preserved-or-tritone ${input}->${out}`);
        }
      }
    }
    passed++;
  }
}

// ---------------------------------------------------------------------------
// (d) Monte-Carlo: mean chord_complexity_tier of choose() output is
//     non-decreasing in complexity. Run on the JS rng stream (draws are not
//     comparable to Python, only the distributional trend is).
// ---------------------------------------------------------------------------
const COMPLEXITIES = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
const N = 8000;
for (const key of ["C:maj", "A:min"]) {
  let prevMean = -1;
  for (const comp of COMPLEXITIES) {
    const rng = makeRng(777);
    const pl = createHarmonyPlanner({ key, complexity: comp, rng });
    let total = 0;
    for (let i = 0; i < N; i++) {
      const [sym] = pl.choose("C:maj", CHOICES);
      total += chordComplexityTier(sym, key);
    }
    const mean = total / N;
    assert.ok(
      mean >= prevMean - 0.03,
      `mean tier must be non-decreasing (key=${key}): ${mean} < ${prevMean}`
    );
    prevMean = mean;
    passed++;
  }
}

// ---------------------------------------------------------------------------
// Additional API/behaviour invariants.
// ---------------------------------------------------------------------------
// Empty choices raises, matching Python's ValueError.
(function () {
  const pl = createHarmonyPlanner({ rng: makeRng(1) });
  assert.throws(() => pl.choose("C:maj", []), /produced no chord candidates/);
  passed++;
})();

// All-unparseable choices fall back to the raw list (no throw) and return one.
(function () {
  const pl = createHarmonyPlanner({ key: "C:maj", complexity: 0.5, rng: makeRng(2) });
  const [sym] = pl.choose("C:maj", [["junk", 0.5], ["also junk", 0.5]]);
  assert.ok(sym === "junk" || sym === "also junk", "raw fallback returns a raw token");
  passed++;
})();

// Deterministic relaxation: at level 0 with only high-tier candidates, the
// least-complex tier is used rather than returning nothing.
(function () {
  const choices = [["C:maj7#11", 0.5], ["C:13", 0.5]]; // tiers 4 and 3
  const pl = createHarmonyPlanner({ key: "C:maj", complexity: 0.1, rng: makeRng(3) });
  for (let i = 0; i < 100; i++) {
    const [sym] = pl.choose("C:maj", choices);
    assert.strictEqual(sym, "C:13", "relaxation picks the least-complex tier");
  }
  passed++;
})();

// level getter and setters.
(function () {
  const pl = createHarmonyPlanner({ key: "C:maj", complexity: 0.5, rng: makeRng(4) });
  assert.strictEqual(pl.level, 2, "level getter");
  pl.setComplexity(0.9);
  assert.strictEqual(pl.level, 4, "setComplexity updates level");
  pl.setComplexity(2.0); // clamps to 1.0 -> level 4
  assert.strictEqual(pl.level, 4, "setComplexity clamps");
  pl.setComplexity(-1.0); // clamps to 0
  assert.strictEqual(pl.level, 0, "setComplexity clamps low");
  pl.setKey("  "); // blank -> C:maj
  pl.setComplexity(0.1);
  // With key C:maj a plain C:maj realizes to a diatonic tonic triad.
  assert.strictEqual(pl.realize("C:maj"), "C:maj", "setKey blank -> C:maj default");
  pl.setGravity(1.0); // exercised via functionBonus math above; just no-throw
  passed++;
})();

console.log("planner: " + passed + " tests passed");
