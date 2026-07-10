"use strict";

/**
 * phrase_engine.js — sequence-level phrase generation (the SEQUENCE is the unit).
 *
 * Faithful port of python/src/engines/phrase_engine.py. Answers "give me an
 * N-bar phrase in key K" as a list of [chordSymbol, durationBeats] pairs whose
 * harmonic rhythm is LEARNED (a semi-Markov chain over ROOT MOTION with an
 * explicit, metric-position-conditioned duration model) and whose ending is an
 * imposed V(7) -> I cadence.
 *
 * WHY a port rather than a rewrite: the Python engine is the reference. Its
 * draw ORDER and distribution access (including every backoff fallthrough) are
 * reproduced verbatim so the JS output matches the corpus statistics. The one
 * intentional divergence is the PRNG: Max has no seedable RNG, so rng.js's
 * mulberry32 replaces Python's random.Random. Identical seeds therefore do NOT
 * produce identical sequences across the two languages — only the same
 * DISTRIBUTIONS do, which is why the cross-check compares histograms, never
 * individual draws.
 */

const fs = require("fs");
const { CANON_ROOT, QUALITY_INTERVALS, PITCH_CLASSES, parseKey } = require("./chord_vocab.js");
const { makeRng } = require("./rng.js");

// Rejection-sample this many exact-length runs before falling back to a
// truncated draw that always fits (see run()).
const MAX_TRIES = 200;
// Beats reserved at the end for the tonic resolution (one 4/4 bar).
const CADENCE_BARS = 1;
// Multiplicative pull toward in-key roots at full Cadence. At gravity=0 the
// corpus transition distribution is reproduced untouched.
const MAX_TONAL_PULL = 4.0;

// Scale degrees (semitones from the tonic) treated as "at home" in each mode.
// Minor includes the raised 7th (11) so the dominant belongs. Stored as Sets
// for O(1) membership; degrees are always non-negative (via mod12).
const DIATONIC = {
  maj: new Set([0, 2, 4, 5, 7, 9, 11]),
  min: new Set([0, 2, 3, 5, 7, 8, 10, 11]),
};

// JS `%` can be negative for negative operands; Python's cannot. Every modulo
// on a possibly-negative pitch value must go through this to match the data's
// key-space arithmetic. (mod12 is not exported by chord_vocab, so reproduced.)
function mod12(x) {
  return ((x % 12) + 12) % 12;
}

/**
 * isDiatonic(rootPc, quality, tonicPc, mode, home) -> boolean.
 *
 * Are ALL of this chord's notes in the key's scale? Testing the root alone is
 * WRONG: in A minor, A:maj7 has a diatonic ROOT but a raised third and seventh.
 * Testing every interval of the quality yields exactly the diatonic sevenths
 * (in C: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bhdim7) and correctly rejects A:maj7 in A
 * minor. `home` is the DIATONIC Set for `mode`.
 */
function isDiatonic(rootPc, quality, tonicPc, mode, home) {
  const degree = mod12(rootPc - tonicPc);
  const intervals = QUALITY_INTERVALS[quality];
  if (!intervals || intervals.length === 0) return false;
  for (const iv of intervals) {
    if (!home.has(mod12(degree + iv))) return false;
  }
  return true;
}

/**
 * pick(rng, dist) — sample a key from a [[key, prob], ...] table.
 * r = rng(); walk cumulative prob; return the first key whose bucket covers r,
 * else the last key (guards against probabilities summing just under 1).
 */
function pick(rng, dist) {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < dist.length; i++) {
    acc += dist[i][1];
    if (r <= acc) return dist[i][0];
  }
  return dist.length ? dist[dist.length - 1][0] : null;
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * createPhraseEngine(modelJsonPath, rng) -> { generate(...) }.
 *
 * `rng` is the default stream (a function -> float in [0,1)); when generate()
 * is given a numeric `seed` it makes a fresh mulberry32 stream instead. Throws
 * if the model file is missing or malformed.
 */
function createPhraseEngine(modelJsonPath, rng) {
  let m;
  try {
    m = JSON.parse(fs.readFileSync(modelJsonPath, "utf8"));
  } catch (exc) {
    throw new Error(`cannot load phrase model ${modelJsonPath}: ${exc.message}`);
  }
  for (const required of ["transition", "duration", "cadence", "duration_support"]) {
    if (!(required in m)) {
      throw new Error(`phrase model ${modelJsonPath} missing '${required}'`);
    }
  }

  const trans = m.transition; // {quality: [[[dpc, nextQ], p], ...]}
  const transMarginal = m.transition_marginal; // [[[dpc, q], p], ...]
  const dur = m.duration; // {"quality|m": [[dur, p], ...]}  (keys contain '|', safe as object)
  const durAll = m.duration_all; // [[dur, p], ...]
  const qualities = m.qualities || [];
  const cadence = m.cadence;
  const support = m.duration_support;

  // duration_backoff is keyed by integer metric position ("0".."3"). Integer
  // keys in a plain JS object get reordered on iteration; we only ever do a
  // direct lookup here so order is immaterial, but the project rule is that
  // integer-keyed collections live in a Map — so honor it.
  const durBackoff = new Map();
  for (const k of Object.keys(m.duration_backoff || {})) {
    durBackoff.set(Number(k), m.duration_backoff[k]);
  }

  // onset_position has INTEGER keys and MUST be a Map (a plain object would
  // reorder the metric positions). [[m, p], ...] -> Map<number, number>.
  const onsetPos = new Map();
  for (const [k, p] of m.onset_position || []) {
    onsetPos.set(Number(k), p);
  }

  // Memoize isDiatonic on (degree, quality, mode): the transition reweighting
  // calls it for every candidate on every step, and the truth value depends
  // only on the degree (not the absolute root) and the mode.
  const diatonicMemo = new Map();
  function isDiatonicMemo(rootPc, quality, tonicPc, mode, home) {
    const degree = mod12(rootPc - tonicPc);
    const memoKey = degree + "|" + quality + "|" + mode;
    let hit = diatonicMemo.get(memoKey);
    if (hit === undefined) {
      hit = isDiatonic(rootPc, quality, tonicPc, mode, home);
      diatonicMemo.set(memoKey, hit);
    }
    return hit;
  }

  /**
   * drawMotion(quality, rng, root, ctx) -> [dpcInt, nextQuality].
   *
   * TONAL GRAVITY: trained key-free, an order-1 motion chain reproduces the
   * corpus's constant modulation, so a long phrase drifts from home. With the
   * key known at generation, ctx.gravity>0 multiplies each candidate's weight
   * by `bonus` when the resulting chord is wholly diatonic, then renormalizes.
   * Multiplicative, so out-of-key colour stays reachable — just rarer.
   */
  function drawMotion(quality, rngFn, root, ctx) {
    let dist = trans[quality] || transMarginal;
    if (!dist || dist.length === 0) return [5, "7"]; // descending fifth into a dominant
    if (ctx && ctx.gravity > 0) {
      const bonus = 1.0 + MAX_TONAL_PULL * Math.min(1.0, ctx.gravity);
      const weighted = dist.map(([k, p]) => {
        const rootPc = mod12(root + Number(k[0]));
        const factor = isDiatonicMemo(rootPc, String(k[1]), ctx.tonic, ctx.mode, ctx.home) ? bonus : 1.0;
        return [k, p * factor];
      });
      let total = 0;
      for (const [, p] of weighted) total += p;
      if (total > 0) {
        dist = weighted.map(([k, p]) => [k, p / total]);
      }
    }
    const chosen = pick(rngFn, dist);
    if (!chosen) return [5, "7"];
    return [Number(chosen[0]), String(chosen[1])];
  }

  /**
   * drawDuration(quality, mpos, rng, maxD) -> int beats.
   *
   * Learned harmonic rhythm D(d | quality, metric position). Backoff chain:
   * duration["q|m"] -> duration_backoff[m] -> duration_all. `maxD` truncates
   * the support so a run lands exactly on target; 1 beat is always present so a
   * truncated draw always exists.
   */
  function drawDuration(quality, mpos, rngFn, maxD) {
    const chain = [dur[quality + "|" + mpos], durBackoff.get(mpos), durAll];
    for (let level = 0; level < chain.length; level++) {
      let dist = chain[level];
      if (!dist || dist.length === 0) continue;
      if (maxD != null) {
        dist = dist.filter(([d]) => d <= maxD);
        if (dist.length === 0) continue;
        let total = 0;
        for (const [, p] of dist) total += p;
        dist = dist.map(([d, p]) => [d, p / total]);
      }
      const d = pick(rngFn, dist);
      if (d) return Math.trunc(d);
    }
    return maxD == null ? 1 : Math.min(1, maxD);
  }

  /**
   * run(root, quality, target, rng, truncate, ctx) -> segs | null.
   *
   * Walk the chain from (root, quality) for exactly `target` beats. Returns
   * [[rootPc, quality, dur], ...], or null if it overshot (only possible when
   * truncate=false). Metric position is tracked so durations stay idiomatic.
   */
  function run(root, quality, target, rngFn, truncate, ctx) {
    const segs = [];
    let onset = 0;
    let q = quality;
    let r = root;
    while (onset < target) {
      const remaining = target - onset;
      const d = drawDuration(q, onset % 4, rngFn, truncate ? remaining : null);
      if (d > remaining) return null; // overshot: reject this run
      segs.push([r, q, d]);
      onset += d;
      if (onset === target) return segs;
      const [dpc, nextQ] = drawMotion(q, rngFn, r, ctx);
      q = nextQ;
      r = mod12(r + dpc);
    }
    return segs;
  }

  /**
   * body(root, quality, target, rng, ctx) -> segs.
   * Exact-length body: rejection-sample for distributional fidelity, then fall
   * back to a truncated draw that cannot fail (never returns silence).
   */
  function body(root, quality, target, rngFn, ctx) {
    if (target <= 0) return [];
    for (let i = 0; i < MAX_TRIES; i++) {
      const r = run(root, quality, target, rngFn, false, ctx);
      if (r) return r;
    }
    return run(root, quality, target, rngFn, true, ctx) || [[root, quality, target]];
  }

  /**
   * dominantDuration(avail, rng) -> int beats.
   *
   * How long the cadential V is held. A V of length d starts at metric position
   * m = (avail - d) % 4, so each candidate length implies a DIFFERENT metric
   * position and candidates must be scored by the JOINT P(m) * P(d | q='7', m),
   * NOT P(d | q, m) alone: an off-beat onset is almost always 1 beat, so the
   * conditional would make a weak-beat 1-beat dominant look near-certain and the
   * cadence would land off the beat.
   */
  function dominantDuration(avail, rngFn) {
    const maxD = avail > 1 ? Math.max(1, Math.min(avail - 1, 4)) : 1;
    const weights = [];
    for (const d of support) {
      if (d > maxD) continue;
      const mpos = mod12Metric(avail - d);
      const pM = onsetPos.get(mpos) || 0;
      if (pM <= 0) continue;
      const chain = [dur["7|" + mpos], durBackoff.get(mpos), durAll];
      for (let level = 0; level < chain.length; level++) {
        const dist = chain[level];
        if (dist) {
          let pD = 0;
          for (const [dd, prob] of dist) {
            if (dd === d) { pD = prob; break; }
          }
          if (pD > 0) weights.push([d, pM * pD]);
          break; // consult only the first available backoff level
        }
      }
    }
    if (weights.length === 0) return maxD;
    let total = 0;
    for (const [, p] of weights) total += p;
    const normalized = weights.map(([d, p]) => [d, p / total]);
    const chosen = pick(rngFn, normalized);
    return chosen != null ? Math.trunc(chosen) : maxD;
  }

  // Metric position is onset % 4; avail-d is always >= 0 here, but route it
  // through a mod-4 that is safe for the general case for parity with Python.
  function mod12Metric(x) {
    return ((x % 4) + 4) % 4;
  }

  /** parseSymbol('D:min7') -> [pc, quality] | null (quality must be in model). */
  function parseSymbol(sym) {
    if (!sym || sym.indexOf(":") === -1) return null;
    const i = sym.indexOf(":");
    const root = sym.slice(0, i);
    const quality = sym.slice(i + 1);
    const pc = PITCH_CLASSES[root];
    if (pc == null || qualities.indexOf(quality) === -1) return null;
    return [pc, quality];
  }

  /**
   * render(segs) -> [[symbol, dur], ...].
   * Pitch classes -> canonical runtime spelling ('Bb:maj7', never 'B-').
   * COALESCE adjacent identical symbols by summing durations: splicing the
   * cadential V onto a body that already ended on the V would otherwise
   * re-trigger the chord instead of sustaining it.
   */
  function render(segs) {
    const out = [];
    for (const [r, q, d] of segs) {
      const symbol = CANON_ROOT[mod12(r)] + ":" + q;
      if (out.length && out[out.length - 1][0] === symbol) {
        out[out.length - 1][1] += Math.trunc(d);
      } else {
        out.push([symbol, Math.trunc(d)]);
      }
    }
    return out;
  }

  /**
   * generate(bars, key, opts) -> [[chordSymbol, durationBeats], ...].
   *
   * Durations sum to exactly bars*4. `cadence` (0..1) is BOTH the probability
   * the final bar resolves via an authentic V(7)->I and the tonal-gravity
   * strength keeping the body's roots in key. `seedChord` optionally starts the
   * walk off the tonic; a numeric `seed` makes it deterministic.
   */
  function generate(bars, key, opts) {
    const o = opts || {};
    const seedChord = o.seedChord != null ? o.seedChord : null;
    const cadence = o.cadence != null ? o.cadence : 1.0;
    const seed = o.seed != null ? o.seed : null;

    let barsInt = Math.trunc(Number(bars));
    if (!Number.isFinite(barsInt)) barsInt = 1;
    barsInt = Math.max(1, barsInt);
    const total = barsInt * 4;
    const rngFn = seed != null ? makeRng(seed) : rng;

    let { tonicPc, mode } = parseKey(key);
    if (tonicPc == null) tonicPc = 0;
    const cad = cadence_for(mode);
    const finalQ = String((cad && cad.final) || (mode === "min" ? "min7" : "maj7"));
    const preQ = String((cad && cad.pre) || "7");
    const gravity = clamp01(cadence);
    const ctx = {
      tonic: tonicPc,
      mode: mode,
      gravity: gravity,
      home: DIATONIC[mode] || DIATONIC.maj,
    };

    let startRoot = tonicPc;
    let startQ = finalQ;
    if (seedChord) {
      const parsed = parseSymbol(seedChord);
      if (parsed) {
        startRoot = parsed[0];
        startQ = parsed[1];
      }
    }

    const resolve = rngFn() < gravity;
    if (!resolve || total < 4 + 2) {
      // Free ending: one unconstrained run of the whole phrase.
      return render(body(startRoot, startQ, total, rngFn, ctx));
    }

    // Reserve the final bar for the tonic, reached by a V(7). The V's duration
    // is drawn at the metric position it actually lands on, so a mid-bar
    // dominant fills to the downbeat like the corpus does.
    const tail = CADENCE_BARS * 4;
    const domRoot = mod12(tonicPc + 7); // V: a descending fifth from the tonic
    const domDur = dominantDuration(total - tail, rngFn);
    const bodyTarget = total - tail - domDur;

    const segs = bodyTarget > 0 ? body(startRoot, startQ, bodyTarget, rngFn, ctx) : [];
    segs.push([domRoot, preQ, domDur]);
    segs.push([tonicPc, finalQ, tail]);
    return render(segs);
  }

  function cadence_for(mode) {
    const key = mode === "min" ? "minor" : "major";
    return cadence[key] || {};
  }

  return { generate };
}

module.exports = {
  createPhraseEngine,
  DIATONIC,
  MAX_TONAL_PULL,
  isDiatonic,
};
