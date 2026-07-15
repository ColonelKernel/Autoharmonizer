"use strict";

/**
 * markov_engine.js — multi-corpus Spice blend sampling.
 *
 * Port of the blend path of python/src/markov_engine.py (the legacy single-table
 * path is intentionally omitted; this engine is corpus-blend only). The input
 * chord is transposed into normalized (C/Am) key space, the Color dial mixes the
 * per-corpus distributions, Adventure tempers, Gravity biases toward cadence,
 * one target is sampled, and it is transposed back into the current key.
 *
 * Draws are NOT reproducible against Python (MT19937 vs. an injected JS rng), so
 * nothing here is pinned by draw; the parity fixture pins the deterministic
 * distribution math in blend.js. The FALLBACK LADDER ordering, however, is
 * load-bearing behavior and is unit-tested directly.
 */

const blend = require("./blend.js");
const { parseKey, transposeChord } = require("./chord_vocab.js");

/**
 * createMarkovEngine({corpora, rng, fallback, color, adventure, key, gravity})
 *   -> { sample, setColor, setAdventure, setSpice, setKey, setGravity }.
 *
 * `rng` is a function returning a float in [0,1) (e.g. from rng.js makeRng).
 * `corpora` is a corpus.js accessor object.
 */
function createMarkovEngine(opts) {
  opts = opts || {};
  const corpora = opts.corpora;
  const rng = opts.rng;
  // Explicit null-checks so an intentional 0 is honored (0 || x would drop it).
  let fallback = opts.fallback != null ? opts.fallback : "echo_input";
  let color = opts.color != null ? opts.color : 0;
  let adventure = opts.adventure != null ? opts.adventure : 0;
  let key = opts.key != null && String(opts.key).trim() ? opts.key : "C:maj";
  let gravity = opts.gravity != null ? opts.gravity : 0;

  /**
   * Weighted draw over Array<[target, prob]>, mirroring Python's
   * random.choices(targets, weights=probs): pick r in [0, sumProbs) and return
   * the first entry whose running cumulative exceeds r (bisect_right semantics).
   * Returns [chosenTarget, itsProb].
   */
  function choose(choices) {
    let total = 0;
    for (const [, p] of choices) total += p;
    const r = rng() * total;
    let cum = 0;
    let idx = choices.length - 1; // default to last (guards float rounding at end)
    for (let k = 0; k < choices.length; k++) {
      cum += choices[k][1];
      if (r < cum) {
        idx = k;
        break;
      }
    }
    return [choices[idx][0], choices[idx][1]];
  }

  /**
   * Pick a target from a NORMALIZED (C/Am) [[target, prob], ...] distribution.
   *
   * With a theory candidate_selector (v4's HarmonyPlanner), the choices are
   * transposed to RUNTIME spelling FIRST — the planner classifies complexity
   * against the live key, so it must see live-key chords — and the selector's
   * chosen chord is returned directly (already runtime). Without a selector the
   * internal weighted draw picks in normalized space and the winner is
   * transposed back. Mirrors markov_engine.py::_blend_sample exactly.
   */
  function resolvePick(chord, normChoices, offset, selector) {
    if (selector) {
      const runtimeChoices = normChoices.map(([t, p]) => [transposeChord(t, -offset), p]);
      return selector(chord, runtimeChoices, "markov"); // [runtimeSymbol, prob]
    }
    const [chosenNorm, prob] = choose(normChoices);
    return [transposeChord(chosenNorm, -offset), prob];
  }

  function blendSample(chord, selector) {
    const [normIn, offset] = blend.normalizeToKey(chord, key);
    const weights = blend.colorWeights(color, corpora.names());
    const tau = blend.temperature(adventure);
    const mode = parseKey(key).mode;
    // Debug string of the effective corpus weights, sorted by name (matches
    // Python's `" ".join(f"{n}:{w:.2f}" for n, w in sorted(weights.items()))`).
    const mix = [...weights.keys()]
      .sort()
      .map((n) => `${n}:${weights.get(n).toFixed(2)}`)
      .join(" ");

    const choices = blend.blendedChoices(corpora, weights, tau, normIn, mode, gravity);
    if (choices.length > 0) {
      const [output, prob] = resolvePick(chord, choices, offset, selector);
      return {
        output,
        probability: prob,
        candidates: choices.length,
        fallbackUsed: false,
        error: null,
        mix,
      };
    }
    return blendFallback(chord, normIn, offset, tau, mix, selector);
  }

  /**
   * The fallback ladder. Order is load-bearing:
   *  (1) The pooled "all" dist for normIn (temperature + cadence), REGARDLESS of
   *      the configured policy -> fallbackUsed with a real musical output.
   *  (2) The configured policy: error_only | echo_input | global_top | random_source.
   *  (3) Final default: echo the input chord.
   */
  function blendFallback(chord, normIn, offset, tau, mix, selector) {
    const error = `unknown chord: ${chord}`;
    const mode = parseKey(key).mode;

    // (1) Pooled "all" chain so we stay musical when the source chord simply
    //     isn't in the current color window.
    const dist = corpora.pooled().get(normIn);
    if (dist && dist.length > 0) {
      const choices = blend.applyCadence(blend.applyTemperature(dist, tau), mode, gravity);
      const [output, prob] = resolvePick(chord, choices, offset, selector);
      return {
        output,
        probability: prob,
        candidates: choices.length,
        fallbackUsed: true,
        error,
        mix: mix + " +all",
      };
    }

    // (2) Configured fallback policy.
    if (fallback === "error_only") {
      return { output: null, probability: null, candidates: 0, fallbackUsed: true, error, mix };
    }
    if (fallback === "echo_input") {
      return { output: chord, probability: null, candidates: 0, fallbackUsed: true, error, mix };
    }
    if (fallback === "global_top" && corpora.globalFallback.length > 0) {
      const topNorm = corpora.globalFallback[0][0];
      return {
        output: transposeChord(topNorm, -offset),
        probability: null,
        candidates: 0,
        fallbackUsed: true,
        error,
        mix,
      };
    }
    if (fallback === "random_source") {
      const pooled = corpora.pooled();
      const sources = [...pooled.keys()];
      if (sources.length > 0) {
        // Python random.choice(sources); draw is not reproduced, any index works.
        const src = sources[Math.floor(rng() * sources.length)];
        const choices = blend.applyTemperature(pooled.get(src), tau);
        const [output, prob] = resolvePick(chord, choices, offset, selector);
        return {
          output,
          probability: prob,
          candidates: choices.length,
          fallbackUsed: true,
          error,
          mix,
        };
      }
    }

    // (3) Safe default: echo the input chord.
    return { output: chord, probability: null, candidates: 0, fallbackUsed: true, error, mix };
  }

  return {
    sample(rawInput, opts) {
      const selector = opts && opts.candidateSelector ? opts.candidateSelector : null;
      const chord = String(rawInput == null ? "" : rawInput).trim();
      if (!chord) {
        return {
          output: null,
          probability: null,
          candidates: 0,
          fallbackUsed: false,
          error: "empty chord input",
          mix: null,
        };
      }
      return blendSample(chord, selector);
    },
    setColor(v) {
      color = Number(v);
    },
    setAdventure(v) {
      adventure = Number(v);
    },
    // Macro: one dial drives both Color and Adventure together.
    setSpice(v) {
      color = Number(v);
      adventure = Number(v);
    },
    setKey(v) {
      const s = String(v == null ? "" : v).trim();
      key = s || "C:maj";
    },
    setGravity(v) {
      gravity = Number(v);
    },
  };
}

module.exports = { createMarkovEngine };
