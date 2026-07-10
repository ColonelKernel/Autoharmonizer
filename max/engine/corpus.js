"use strict";

/**
 * corpus.js — load the nested per-corpus Markov transition COUNTS and normalize
 * them into per-source probability distributions.
 *
 * Direct port of python/src/corpus_loader.py. The JSON (data/markov_corpora_t.json)
 * is {corpusName: {sourceChord: {targetChord: INTEGER COUNT}}}, key-transposed to
 * C/Am space. Per corpus, per source we divide each target count by the sum of
 * that source's counts to get a probability. Corpora stay separate so the blend
 * engine can mix them live; "all" is the pre-pooled corpus used for fallback.
 *
 * Why Maps and not plain objects for the source->dist tables: although chord
 * symbols ("F:maj") are string keys that objects would preserve, the project
 * rule is that keyed lookups the engine iterates go through Maps, and using Maps
 * here keeps a single consistent shape (Map<source, Array<[target, prob]>>)
 * across corpus.js / blend.js / markov_engine.js.
 *
 * Ordering is load-bearing: the per-source [target, prob] arrays preserve the
 * JSON's target order, and globalFallback preserves first-seen order under a
 * stable descending sort — this reproduces Python's dict-insertion + stable
 * sort tie-breaking exactly, which the downstream temperature/cadence sorts
 * depend on for identical output ordering.
 */

const fs = require("fs");

/**
 * Normalize one corpus's raw counts into per-source distributions.
 * raw: {source: {target: count}}  ->  {distBySource: Map, totalBySource: Map}.
 * A source whose counts sum to <= 0 maps to an empty [] (mirrors Python, which
 * guards total <= 0 and stores an empty dict).
 */
function normalizeCorpus(raw) {
  const distBySource = new Map(); // source -> Array<[target, prob]>, JSON order
  const totalBySource = new Map(); // source -> summed count (blend confidence)
  for (const source of Object.keys(raw)) {
    const targets = raw[source];
    let total = 0;
    for (const t of Object.keys(targets)) total += targets[t];
    totalBySource.set(source, total);
    if (total <= 0) {
      distBySource.set(source, []);
      continue;
    }
    const arr = [];
    for (const t of Object.keys(targets)) arr.push([t, targets[t] / total]);
    distBySource.set(source, arr);
  }
  return { distBySource, totalBySource };
}

/**
 * loadCorpora(jsonPath) -> corpora accessor object. See module docstring for the
 * exported shape. Throws on a missing/malformed (non-object or empty) JSON, like
 * the Python CorpusLoadError path.
 */
function loadCorpora(jsonPath) {
  const nested = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (
    typeof nested !== "object" ||
    nested === null ||
    Array.isArray(nested) ||
    Object.keys(nested).length === 0
  ) {
    throw new Error("Corpora JSON must be a non-empty object");
  }

  const corpora = new Map(); // name -> {distBySource, totalBySource}
  for (const name of Object.keys(nested)) {
    corpora.set(name, normalizeCorpus(nested[name]));
  }

  // Global fallback pool from the pooled "all" corpus (union of every corpus if
  // "all" is somehow absent). Sum counts per target, most-common first.
  const poolCounts = new Map(); // target -> summed count, first-seen order
  const allRaw = nested.all;
  // Python: `[all_raw] if all_raw else nested.values()`. A dict is truthy when
  // non-empty, so a present, non-empty "all" wins.
  const sourcesRaw =
    allRaw && Object.keys(allRaw).length > 0
      ? [allRaw]
      : Object.keys(nested).map((k) => nested[k]);
  for (const corpusRaw of sourcesRaw) {
    for (const src of Object.keys(corpusRaw)) {
      const targets = corpusRaw[src];
      for (const t of Object.keys(targets)) {
        poolCounts.set(t, (poolCounts.get(t) || 0) + targets[t]);
      }
    }
  }
  let poolTotal = 0;
  for (const v of poolCounts.values()) poolTotal += v;
  if (poolTotal === 0) poolTotal = 1; // avoid /0; matches Python's `or 1`
  // Stable descending sort keeps first-seen order for equal counts, matching
  // Python's `sorted(..., reverse=True)` (stable, ties retain original order).
  const globalFallback = [...poolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => [t, c / poolTotal]);

  const emptyMap = new Map();
  const distBySource = (corpus) => {
    const c = corpora.get(corpus);
    return c ? c.distBySource : emptyMap;
  };

  return {
    // Corpus names EXCLUDING the pooled "all" (JSON order).
    names: () => Object.keys(nested).filter((n) => n !== "all"),
    // Whole per-source table for a corpus: Map<source, Array<[target, prob]>>.
    distBySource,
    // True only when the corpus contains the source with a non-empty dist —
    // mirrors Python's `if not dist: continue` (None OR empty both skip).
    has: (corpus, source) => {
      const c = corpora.get(corpus);
      return !!c && c.distBySource.has(source) && c.distBySource.get(source).length > 0;
    },
    // The pooled "all" table (empty Map if absent).
    pooled: () => distBySource("all"),
    // Pooled counts as [target, prob], most-common first.
    globalFallback,
  };
}

module.exports = { loadCorpora };
