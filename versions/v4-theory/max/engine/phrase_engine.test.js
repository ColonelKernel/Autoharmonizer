"use strict";

/**
 * phrase_engine.test.js — assertions for the sequence-level phrase generator.
 * Run with:  node phrase_engine.test.js
 * Exits non-zero if any assertion fails. No external test framework.
 *
 * Mirrors python/tests/test_phrase_engine.py. Two differences from the Python
 * suite, both forced by the swapped PRNG (mulberry32 vs random.Random):
 *   - No golden fixed-seed regression: the JS stream is a different sequence,
 *     so identical seeds do not reproduce the Python phrases. Structure and
 *     DISTRIBUTION are pinned instead.
 *   - The corpus-fidelity claim is checked directly against Python via a
 *     total-variation cross-check on the duration and root-motion histograms
 *     (the histograms match even though individual draws never do).
 */

const assert = require("assert");
const path = require("path");
const { execFileSync } = require("child_process");

const { createPhraseEngine, DIATONIC, isDiatonic } = require("./phrase_engine.js");
const { CANON_ROOT, QUALITY_INTERVALS, PITCH_CLASSES, parseKey } = require("./chord_vocab.js");

const MODEL = path.resolve(__dirname, "../../data/phrase_model_jazznet.json");
const REPO = path.resolve(__dirname, "../..");
const PY_DIR = path.join(REPO, "python");
const PYTHON = "/opt/anaconda3/bin/python3";
const SUPPORT = new Set([1, 2, 4, 8]);

let passed = 0;
let failed = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(name + (extra !== undefined ? "  -> " + extra : ""));
  }
}

const engine = createPhraseEngine(MODEL, Math.random);

function onsets(phrase) {
  let acc = 0;
  const out = [];
  for (const [, d] of phrase) {
    out.push(acc);
    acc += d;
  }
  return out;
}
function sumDur(phrase) {
  return phrase.reduce((a, [, d]) => a + d, 0);
}

/* --- contract ----------------------------------------------------------- */

// Missing model must throw (parity with test_missing_model_raises).
let threw = false;
try {
  createPhraseEngine("/nonexistent/phrase_model.json", Math.random);
} catch (e) {
  threw = true;
}
check("missing model throws", threw);

// Exact length + support across bars x keys x seeds.
{
  let lenOk = true;
  let supportOk = true;
  let nonEmpty = true;
  for (const bars of [2, 4, 8, 16]) {
    for (const key of ["C:maj", "A:min", "Eb:maj", "F#:min"]) {
      for (let seed = 0; seed < 12; seed++) {
        const p = engine.generate(bars, key, { seed });
        if (sumDur(p) !== bars * 4) { lenOk = false; }
        if (p.length === 0) { nonEmpty = false; }
        // Only a coalesced held chord at the cadence splice may exceed support.
        const inSupport = p.filter(([, d]) => SUPPORT.has(d)).length;
        if (inSupport < p.length - 1) supportOk = false;
        if (!p.every(([, d]) => Number.isInteger(d) && d >= 1)) supportOk = false;
      }
    }
  }
  check("exact length = bars*4 (all bars/keys/seeds)", lenOk);
  check("never returns an empty phrase", nonEmpty);
  check("durations integer >=1 and in support (except cadence splice)", supportOk);
}

// Every symbol sonifiable: canonical root, no corpus '-' spelling, known quality.
{
  let ok = true;
  for (const key of ["C:maj", "A:min", "Bb:maj", "G:min", "F#:maj"]) {
    for (let seed = 0; seed < 20; seed++) {
      for (const [chord] of engine.generate(8, key, { seed })) {
        const [root, quality] = chord.split(":");
        if (CANON_ROOT.indexOf(root) === -1) ok = false;
        if (chord.indexOf("-") !== -1) ok = false;
        if (!(quality in QUALITY_INTERVALS)) ok = false;
      }
    }
  }
  check("every symbol is sonifiable (canonical root, known quality, no '-')", ok);
}

// No adjacent duplicate chord symbols (tests the coalescing).
{
  let ok = true;
  for (const cadence of [0.0, 1.0]) {
    for (const bars of [2, 4, 8, 16]) {
      for (let seed = 0; seed < 40; seed++) {
        const symbols = engine.generate(bars, "C:maj", { cadence, seed }).map(([c]) => c);
        for (let i = 1; i < symbols.length; i++) {
          if (symbols[i] === symbols[i - 1]) ok = false;
        }
      }
    }
  }
  check("no adjacent duplicate chord symbols", ok);
}

// cadence=1 -> tonic (final quality, dur 4) reached by the dominant '7'.
{
  let ok = true;
  const cases = [["C:maj", "maj7"], ["A:min", "min7"], ["Eb:maj", "maj7"]];
  for (const [key, finalQ] of cases) {
    const { tonicPc } = parseKey(key);
    for (let seed = 0; seed < 25; seed++) {
      const p = engine.generate(4, key, { cadence: 1.0, seed });
      const [lastChord, lastDur] = p[p.length - 1];
      const [lRoot, lQual] = lastChord.split(":");
      if (PITCH_CLASSES[lRoot] !== tonicPc) ok = false;
      if (lQual !== finalQ) ok = false;
      if (lastDur !== 4) ok = false;
      const [preChord] = p[p.length - 2];
      const [pRoot, pQual] = preChord.split(":");
      if (pQual !== "7") ok = false;
      if (PITCH_CLASSES[pRoot] !== (tonicPc + 7) % 12) ok = false;
    }
  }
  check("cadence=1 resolves to tonic via authentic V(7)->I, tonic owns final bar", ok);
}

// cadence=0 must NOT resolve most of the time.
{
  const tonicPc = parseKey("C:maj").tonicPc;
  let resolved = 0;
  for (let seed = 0; seed < 60; seed++) {
    const p = engine.generate(4, "C:maj", { cadence: 0.0, seed });
    const root = p[p.length - 1][0].split(":")[0];
    if (PITCH_CLASSES[root] === tonicPc) resolved++;
  }
  check("cadence=0 lets the phrase wander (resolved < 30/60)", resolved < 30, resolved + "/60");
}

// Determinism with a seed (across independent engine instances); seeds differ.
{
  const a = engine.generate(8, "C:maj", { seed: 99 });
  const b = createPhraseEngine(MODEL, Math.random).generate(8, "C:maj", { seed: 99 });
  check("determinism: same seed -> identical phrase", JSON.stringify(a) === JSON.stringify(b));
  const variants = new Set();
  for (let s = 0; s < 10; s++) variants.add(JSON.stringify(engine.generate(8, "C:maj", { seed: s })));
  check("different seeds differ", variants.size > 1, variants.size);
}

// seed_chord starts the walk.
check(
  "seedChord starts the walk",
  engine.generate(8, "C:maj", { seedChord: "D:min7", seed: 5 })[0][0] === "D:min7"
);

// Unknown key falls back to C.
{
  const p = engine.generate(4, "not-a-key", { seed: 1 });
  check("unknown key: exact length preserved", sumDur(p) === 16);
  check("unknown key: falls back to C", p[p.length - 1][0].startsWith("C:"));
}

// Short phrase still cadences (2 bars, the tightest constraint).
{
  const p = engine.generate(2, "C:maj", { cadence: 1.0, seed: 3 });
  check("short phrase exact length", sumDur(p) === 8);
  check("short phrase cadences to C:maj7 via G:7",
    p[p.length - 1][0] === "C:maj7" && p[p.length - 2][0] === "G:7");
}

/* --- the model actually learned harmonic rhythm ------------------------- */

// Duration histogram: 2 beats most common, then 4, then 8; 1 beat < 20%.
{
  const counts = new Map();
  for (let seed = 0; seed < 500; seed++) {
    for (const [, d] of engine.generate(8, "C:maj", { cadence: 0.0, seed })) {
      counts.set(d, (counts.get(d) || 0) + 1);
    }
  }
  let total = 0;
  for (const v of counts.values()) total += v;
  const share = (d) => (counts.get(d) || 0) / total;
  check("duration share[2] in (0.40,0.75)", share(2) > 0.40 && share(2) < 0.75, share(2).toFixed(3));
  check("duration share[4] in (0.15,0.50)", share(4) > 0.15 && share(4) < 0.50, share(4).toFixed(3));
  check("duration share[1] < 0.20", share(1) < 0.20, share(1).toFixed(3));
  check("duration ordering 2 > 4 > 8", share(2) > share(4) && share(4) > share(8),
    `${share(2).toFixed(3)}/${share(4).toFixed(3)}/${share(8).toFixed(3)}`);
}

// >90% of chord onsets fall on beat 0 or 2 of the bar (metric sense).
{
  let strong = 0;
  let weak = 0;
  for (let seed = 0; seed < 300; seed++) {
    for (const o of onsets(engine.generate(8, "C:maj", { seed }))) {
      if (o % 4 === 0 || o % 4 === 2) strong++;
      else weak++;
    }
  }
  const frac = strong / (strong + weak);
  check("onsets on strong beats > 90%", frac > 0.90, (frac * 100).toFixed(1) + "%");
}

// +5 root motion (the ii-V-I descending-fifth backbone) is most common.
{
  const motions = new Map();
  for (let seed = 0; seed < 300; seed++) {
    const pcs = engine.generate(8, "C:maj", { cadence: 0.0, seed }).map(([c]) => PITCH_CLASSES[c.split(":")[0]]);
    for (let i = 1; i < pcs.length; i++) {
      const mv = ((pcs[i] - pcs[i - 1]) % 12 + 12) % 12;
      motions.set(mv, (motions.get(mv) || 0) + 1);
    }
  }
  let best = null;
  let bestCount = -1;
  for (const [k, v] of motions) if (v > bestCount) { best = k; bestCount = v; }
  check("+5 (descending fifth) is the most common root motion", best === 5, best);
}

// isDiatonic: chord-level (all notes in scale), not root-only.
check("isDiatonic A:maj7 NOT diatonic in A minor", isDiatonic(9, "maj7", 9, "min", DIATONIC.min) === false);
check("isDiatonic A:min7 IS diatonic in A minor", isDiatonic(9, "min7", 9, "min", DIATONIC.min) === true);
check("isDiatonic G:7 IS diatonic in C major", isDiatonic(7, "7", 0, "maj", DIATONIC.maj) === true);

// Cadence dial is tonal gravity: gravity=1 keeps far more chords in key.
{
  function diatonicFraction(key, mode, gravity, n) {
    const tonic = PITCH_CLASSES[key.split(":")[0]];
    const home = DIATONIC[mode];
    let ok = 0;
    let total = 0;
    for (let seed = 0; seed < n; seed++) {
      for (const [chord] of engine.generate(8, key, { cadence: gravity, seed })) {
        const [root, quality] = chord.split(":");
        if (isDiatonic(PITCH_CLASSES[root], quality, tonic, mode, home)) ok++;
        total++;
      }
    }
    return ok / total;
  }
  for (const [key, mode] of [["C:maj", "maj"], ["A:min", "min"]]) {
    const free = diatonicFraction(key, mode, 0.0, 150);
    const home = diatonicFraction(key, mode, 1.0, 150);
    check(`${key}: gravity raises in-key fraction by >0.25`, home > free + 0.25,
      `${(free * 100).toFixed(0)}% -> ${(home * 100).toFixed(0)}%`);
    check(`${key}: gravity=0 still reproduces corpus (>10% in key)`, free > 0.10, free.toFixed(3));
    check(`${key}: colour chords stay reachable (home < 95%)`, home < 0.95, home.toFixed(3));
  }
}

// Minor key avoids the major tonic (chord-level gravity, not root-only).
{
  let tonicMajor = 0;
  let tonicTotal = 0;
  const aPc = PITCH_CLASSES["A"];
  const majorish = new Set(["maj", "maj7", "6", "maj6"]);
  for (let seed = 0; seed < 120; seed++) {
    for (const [chord] of engine.generate(8, "A:min", { cadence: 1.0, seed })) {
      const [root, quality] = chord.split(":");
      if (PITCH_CLASSES[root] === aPc) {
        tonicTotal++;
        if (majorish.has(quality)) tonicMajor++;
      }
    }
  }
  check("minor key: <15% of A tonics are major-flavoured",
    tonicTotal > 0 && tonicMajor / tonicTotal < 0.15, `${tonicMajor}/${tonicTotal}`);
}

/* --- cross-check vs Python (histograms, not individual draws) ----------- */

function tv(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let sa = 0;
  let sb = 0;
  for (const v of Object.values(a)) sa += v;
  for (const v of Object.values(b)) sb += v;
  let s = 0;
  for (const k of keys) s += Math.abs((a[k] || 0) / sa - (b[k] || 0) / sb);
  return s / 2;
}
function jsHistograms(n) {
  const dur = {};
  const mot = {};
  for (let seed = 0; seed < n; seed++) {
    const ph = engine.generate(8, "C:maj", { cadence: 0.0, seed });
    const pcs = [];
    for (const [c, d] of ph) {
      dur[d] = (dur[d] || 0) + 1;
      pcs.push(PITCH_CLASSES[c.split(":")[0]]);
    }
    for (let i = 1; i < pcs.length; i++) {
      const mv = ((pcs[i] - pcs[i - 1]) % 12 + 12) % 12;
      mot[mv] = (mot[mv] || 0) + 1;
    }
  }
  return { dur, mot };
}

let tvDur = null;
let tvMot = null;
try {
  const N = 2000;
  // Python reference: same settings, its own random.Random stream. Absolute
  // model path so cwd (must be python/ for `import src`) does not matter for it.
  const pyCode =
    "import json,collections,sys\n" +
    "from src.engines.phrase_engine import PhraseEngine\n" +
    "from src.chord_vocab import PITCH_CLASSES\n" +
    "eng=PhraseEngine(sys.argv[1])\n" +
    "dur=collections.Counter(); mot=collections.Counter()\n" +
    "for seed in range(" + N + "):\n" +
    "    ph=eng.generate(8,'C:maj',cadence=0.0,seed=seed)\n" +
    "    pcs=[]\n" +
    "    for c,d in ph:\n" +
    "        dur[d]+=1; pcs.append(PITCH_CLASSES[c.partition(':')[0]])\n" +
    "    for a,b in zip(pcs,pcs[1:]): mot[(b-a)%12]+=1\n" +
    "print(json.dumps({'dur':dict(dur),'mot':dict(mot)}))\n";
  const out = execFileSync(PYTHON, ["-c", pyCode, MODEL], { cwd: PY_DIR, encoding: "utf8" });
  const py = JSON.parse(out.trim().split("\n").pop());
  const js = jsHistograms(N);
  tvDur = tv(py.dur, js.dur);
  tvMot = tv(py.mot, js.mot);
  check("cross-check duration histogram TV < 0.05 vs Python", tvDur < 0.05, tvDur.toFixed(4));
  check("cross-check root-motion histogram TV < 0.05 vs Python", tvMot < 0.05, tvMot.toFixed(4));
} catch (e) {
  check("cross-check vs Python ran", false, e.message);
}

/* --- report ------------------------------------------------------------- */

if (tvDur !== null) {
  console.log(`cross-check TV: duration=${tvDur.toFixed(4)}  root-motion=${tvMot.toFixed(4)}`);
}
if (failed) {
  console.error(`phrase_engine.test: ${failed} FAILED, ${passed} passed`);
  for (const f of failures) console.error("  FAIL " + f);
  process.exit(1);
}
console.log(`phrase_engine.test: ${passed} tests passed`);
