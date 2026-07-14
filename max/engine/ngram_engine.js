"use strict";

/**
 * ngram_engine.js — variable-order chord n-gram with a small stateful history.
 *
 * Direct CommonJS port of
 * versions/v4-theory/python/src/engines/ngram_engine.py (class NgramEngine).
 *
 * The learned JSON model supplies the probability mass; this engine remembers
 * the last few chords, backs off from the longest matching context to shorter
 * ones (and finally to the global unigram table), reshapes counts by a
 * temperature, and samples an output. Parity with the Python reference is
 * asserted in ngram_engine.test.js against golden fixtures.
 *
 * Load-bearing Python behaviors reproduced verbatim:
 *   - appendHistory dedupes only *consecutive* repeats, then trims to the last
 *     max_order chords (Python `del self._history[:-max_order]`).
 *   - lookupCounts keys are `str(order)` in orders and the context joined by
 *     "|"; an empty counts list is treated as a miss (Python `if found:`).
 *   - distribution raises each count to the power 1/temperature (counts are
 *     floored at 0 first) and normalizes; a non-positive total yields [].
 *   - The model must declare version === 1, an object `orders`, and a truthy
 *     `global`; anything else is rejected exactly like Python.
 *
 * The model's `run_length_encoded` flag is metadata only: orders/global are
 * stored as plain [chord, count] pairs and are read as such (no RLE decode).
 *
 * The pure helpers (appendHistory, lookupCounts, distribution) are exported so
 * the parity tests can assert them directly against dumped Python I/O.
 */

const fs = require("fs");
const { makeRng } = require("./rng.js");
const { reduceForNeural, parseChord } = require("./theory.js");

const NAME = "ngram";

class NgramModelError extends Error {
  constructor(message) {
    super(message);
    this.name = "NgramModelError";
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---- pure helpers (mirror the Python private methods) ----------------------

// _append: dedupe consecutive repeats, then keep only the last maxOrder chords.
// Returns a NEW history array; does not mutate the input.
function appendHistory(history, chord, maxOrder) {
  const next = history.slice();
  if (next.length === 0 || next[next.length - 1] !== chord) {
    next.push(chord);
  }
  // Python: del self._history[:-self._max_order] -> keep the final maxOrder.
  return next.length > maxOrder ? next.slice(-maxOrder) : next;
}

// _lookup: longest-context backoff, then the global table.
function lookupCounts(orders, globalCounts, history, maxOrder) {
  const maxN = Math.min(maxOrder, history.length);
  for (let order = maxN; order >= 1; order--) {
    const key = history.slice(-order).join("|");
    const table = orders[String(order)];
    const found = table ? table[key] : undefined;
    if (found && found.length) {
      return found;
    }
  }
  return globalCounts;
}

// _distribution: count^(1/tau) then normalize; [] on total <= 0.
function distribution(counts, temperature) {
  const invTau = 1.0 / temperature;
  const weighted = counts.map((pair) => [
    String(pair[0]),
    Math.pow(Math.max(Number(pair[1]), 0.0), invTau),
  ]);
  let total = 0;
  for (const w of weighted) {
    total += w[1];
  }
  if (total <= 0) {
    return [];
  }
  return weighted.map((w) => [w[0], w[1] / total]);
}

/**
 * createNgramEngine({modelPath, fallback, rng, temperature}) -> engine.
 *
 *   modelPath   path to the n-gram JSON model (loaded and validated eagerly).
 *   fallback    "echo_input" (default) | "error_only" | "global_top" |
 *               "random_source" — matches the Python fallback modes.
 *   rng         an rng function () => float in [0,1), OR a numeric seed passed
 *               to rng.js makeRng(), OR null/undefined for Math.random.
 *   temperature sampling temperature (clamped to a 0.05 floor). Default 1.0.
 */
function createNgramEngine(options) {
  const opts = options || {};
  const { modelPath } = opts;
  const fallback = opts.fallback === undefined ? "echo_input" : opts.fallback;
  const temperatureOpt = opts.temperature === undefined ? 1.0 : opts.temperature;
  const rngFn = typeof opts.rng === "function" ? opts.rng : makeRng(opts.rng);

  let model;
  try {
    model = JSON.parse(fs.readFileSync(modelPath, "utf8"));
  } catch (exc) {
    throw new NgramModelError(`cannot load n-gram model ${modelPath}: ${exc.message}`);
  }

  if (model.version !== 1) {
    throw new NgramModelError(`unsupported n-gram schema version: ${JSON.stringify(model.version)}`);
  }
  const globalTable = model.global;
  // Python's `not model.get("global")` rejects None/[]/{}/"" alike, and the
  // engine indexes global as a list (self._global[0]); so require a non-empty
  // ARRAY. (A plain {} is truthy in JS but empty-and-non-indexable — Python
  // rejects it and so must we.)
  if (!isPlainObject(model.orders) || !Array.isArray(globalTable) || globalTable.length === 0) {
    throw new NgramModelError(`n-gram model ${modelPath} is missing orders/global`);
  }

  const orders = model.orders;
  const globalCounts = globalTable;
  const maxOrder = Math.max(1, Math.trunc(Number(model.max_order === undefined ? 4 : model.max_order)));

  let temperature = Math.max(0.05, Number(temperatureOpt));
  let history = [];

  function reset() {
    history = [];
  }

  function setTemperature(t) {
    temperature = Math.max(0.05, Number(t));
  }

  // _choose: weighted pick. Python's random.Random cannot be reproduced, so
  // only distribution/structure is parity-tested — never the individual draw.
  function choose(choices) {
    const symbols = choices.map((c) => c[0]);
    const weights = choices.map((c) => c[1]);
    let totalWeight = 0;
    for (const w of weights) {
      totalWeight += w;
    }
    let target = rngFn() * totalWeight;
    let picked = symbols[symbols.length - 1];
    for (let i = 0; i < choices.length; i++) {
      target -= weights[i];
      if (target < 0) {
        picked = symbols[i];
        break;
      }
    }
    return [picked, choices[symbols.indexOf(picked)][1]];
  }

  function applyFallback(chord) {
    const error = `unknown chord: ${chord}`;
    if (fallback === "error_only") {
      return { output: null, probability: null, candidates: 0, fallbackUsed: true, error };
    }
    if (fallback === "global_top" && globalCounts.length) {
      return { output: String(globalCounts[0][0]), probability: null, candidates: 0, fallbackUsed: true, error };
    }
    if (fallback === "random_source") {
      const sources = Object.keys(orders["1"] || {});
      if (sources.length) {
        const idx = Math.floor(rngFn() * sources.length);
        return { output: sources[idx], probability: null, candidates: sources.length, fallbackUsed: true, error };
      }
    }
    return { output: chord || null, probability: null, candidates: 0, fallbackUsed: true, error };
  }

  function sample(rawInput, sampleOpts) {
    const o = sampleOpts || {};
    const session = o.session === undefined ? true : o.session;
    const candidateSelector = o.candidateSelector;

    const trimmed = String(rawInput).trim();
    const source = reduceForNeural(trimmed);
    if (!source || parseChord(source) === null) {
      return applyFallback(trimmed);
    }
    if (!session) {
      reset();
    }
    history = appendHistory(history, source, maxOrder);
    const choices = distribution(lookupCounts(orders, globalCounts, history, maxOrder), temperature);
    if (!choices.length) {
      return applyFallback(source);
    }
    let selected;
    try {
      selected = candidateSelector
        ? candidateSelector(source, choices, NAME)
        : choose(choices);
    } catch (exc) {
      return { output: null, probability: null, candidates: 0, fallbackUsed: true, error: String(exc && exc.message !== undefined ? exc.message : exc) };
    }
    const output = selected[0];
    const probability = selected[1];
    history = appendHistory(history, output, maxOrder);
    return { output, probability, candidates: choices.length, fallbackUsed: false, error: null };
  }

  return {
    name: NAME,
    sample,
    resetSession: reset,
    setTemperature,
    get history() {
      return history.slice();
    },
  };
}

module.exports = {
  createNgramEngine,
  NgramModelError,
  appendHistory,
  lookupCounts,
  distribution,
};
