"use strict";

/**
 * planner.js — theory-aware candidate reranking and surface realization.
 *
 * Direct port of python/src/harmony/planner.py (class HarmonyPlanner). The
 * learned models still supply the probability distribution; complexity masks
 * and reranks it, and functional voice-leading is a small tie-breaker. Surface
 * realization happens *after* selection so a session commits exactly the token
 * whose proposal was scored.
 *
 * Python's `random.Random` stream cannot be reproduced in JS, so the caller
 * injects an rng: () -> [0,1) (see rng.js). Parity is therefore asserted over
 * masks, function-bonus math, realize() structure, and distributions — never
 * individual random draws (see planner.test.js).
 */

const {
  parseChord,
  chordComplexityTier,
  complexityLevel,
  diatonicQuality,
  harmonicFunction,
  nearestScaleRoot,
} = require("./theory.js");
const { CANON_ROOT } = require("./chord_vocab.js");

// JS `%` yields a negative result for negative operands; Python's does not.
function mod12(x) {
  return ((x % 12) + 12) % 12;
}

// Reproduces theory.Chord.symbol(): `Root:quality[/Bass]` with canonical roots.
function chordSymbol(rootPc, quality, bassPc) {
  let out = CANON_ROOT[mod12(rootPc)] + ":" + quality;
  if (bassPc !== null && bassPc !== undefined) {
    out += "/" + CANON_ROOT[mod12(bassPc)];
  }
  return out;
}

function clamp(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0.0;
  }
  return Math.max(0.0, Math.min(1.0, n));
}

/**
 * createHarmonyPlanner({key, complexity, gravity, rng}) -> planner.
 *
 * rng is an injected () -> [0,1). Returns an object exposing choose, realize,
 * setKey, setComplexity, setGravity, and a `level` getter.
 */
function createHarmonyPlanner(options) {
  const opts = options || {};
  let key = opts.key === undefined ? "C:maj" : opts.key;
  let complexity = clamp(opts.complexity === undefined ? 0.5 : opts.complexity);
  let gravity = clamp(opts.gravity === undefined ? 0.0 : opts.gravity);
  const rng = opts.rng;
  if (typeof rng !== "function") {
    throw new TypeError("createHarmonyPlanner requires an rng function");
  }

  function level() {
    return complexityLevel(complexity);
  }

  function setKey(value) {
    const t = typeof value === "string" ? value.trim() : "";
    key = t || "C:maj";
  }

  function setComplexity(value) {
    complexity = clamp(value);
  }

  function setGravity(value) {
    gravity = clamp(value);
  }

  function functionBonus(source, target) {
    const a = harmonicFunction(source, key);
    const b = harmonicFunction(target, key);
    let bonus = 0.0;
    if (a === "T" && b === "PD") {
      bonus = 0.18;
    } else if (a === "PD" && b === "D") {
      bonus = 0.28;
    } else if (a === "D" && b === "T") {
      bonus = 0.38 + 0.75 * gravity;
    } else if (a === "T" && b === "D") {
      bonus = 0.08;
    }
    if (a === "C" && b === "C") {
      bonus -= 0.12;
    }
    return bonus;
  }

  /**
   * choose(source, choices, modelName) -> [symbol, prob].
   * Sample once from the model distribution after theory reranking.
   */
  function choose(source, choices, modelName) {
    const name = modelName === undefined ? "model" : modelName;

    let valid = [];
    for (const cand of choices) {
      const symbol = cand[0];
      const prob = Math.max(0.0, Number(cand[1]));
      if (parseChord(symbol)) {
        valid.push([symbol, prob]);
      }
    }
    if (valid.length === 0) {
      if (!choices || choices.length === 0) {
        throw new Error(name + " produced no chord candidates");
      }
      valid = choices.map((cand) => [cand[0], Math.max(0.0, Number(cand[1]))]);
    }

    const lvl = level();
    let permitted = valid.filter((item) => chordComplexityTier(item[0], key) <= lvl);
    // Deterministic relaxation: use the least-complex proposals rather than
    // returning silence when no token sits in the requested tier.
    if (permitted.length === 0) {
      let minimum = Infinity;
      for (const item of valid) {
        const t = chordComplexityTier(item[0], key);
        if (t < minimum) {
          minimum = t;
        }
      }
      permitted = valid.filter((item) => chordComplexityTier(item[0], key) === minimum);
    }

    const target = complexity * 4.0;
    const weighted = [];
    for (const item of permitted) {
      const symbol = item[0];
      const probability = item[1];
      const tier = chordComplexityTier(symbol, key);
      // Model likelihood dominates; this bounded factor nudges candidates
      // toward the chosen tier without inventing transitions.
      const proximity = Math.exp(-0.45 * Math.abs(tier - target));
      const functional = Math.exp(functionBonus(source, symbol));
      const weight = Math.max(probability, 1e-12) * proximity * functional;
      weighted.push([symbol, probability, weight]);
    }

    let total = 0.0;
    for (const w of weighted) {
      total += w[2];
    }
    if (total <= 0) {
      // max(permitted, key=prob); Python's max returns the FIRST max on ties.
      let best = permitted[0];
      for (const item of permitted) {
        if (item[1] > best[1]) {
          best = item;
        }
      }
      return [best[0], best[1]];
    }
    const pick = rng() * total;
    let acc = 0.0;
    for (const w of weighted) {
      acc += w[2];
      if (pick <= acc) {
        return [w[0], w[1]];
      }
    }
    const last = weighted[weighted.length - 1];
    return [last[0], last[1]];
  }

  // Python random.choice(seq): seq[int(random() * len(seq))] behaviorally.
  function choice(seq) {
    return seq[Math.floor(rng() * seq.length)];
  }

  /**
   * realize(symbol) -> symbol. Turn the chosen structural token into the
   * audible v4 chord symbol. Reproduces every tier branch exactly.
   */
  function realize(symbol) {
    const chord = parseChord(symbol);
    if (chord === null) {
      return symbol;
    }
    const lvl = level();

    if (lvl <= 1) {
      let root = chord.rootPc;
      let quality = diatonicQuality(root, key, { seventh: lvl === 1 });
      if (quality === null) {
        root = nearestScaleRoot(root, key);
        quality = diatonicQuality(root, key, { seventh: lvl === 1 });
        if (quality === null) {
          quality = lvl ? "maj7" : "maj";
        }
      }
      // Tier 1 exposes inversion as a controlled structural device. It is
      // deterministic for a fixed seed and leaves roughly half root-position.
      let bass = null;
      if (lvl === 1 && rng() < 0.35) {
        const intervals = { maj7: 4, min7: 3, "7": 4, hdim7: 3, dim7: 3 };
        const interval = quality in intervals ? intervals[quality] : 3;
        bass = mod12(root + interval);
      }
      return chordSymbol(root, quality, bass);
    }

    if (lvl === 2) {
      // Compatibility tier: retain the learned token exactly.
      return chordSymbol(chord.rootPc, chord.quality, chord.bassPc);
    }

    let q = chord.quality;
    const fn = harmonicFunction(chord, key);
    if (lvl === 3) {
      if (fn === "D" || q === "7") {
        q = rng() < 0.5 ? "13" : "9";
      } else if (q.startsWith("min")) {
        q = rng() < 0.35 ? "min11" : "min9";
      } else {
        q = fn === "PD" ? "maj7#11" : "maj9";
      }
      return chordSymbol(chord.rootPc, q, chord.bassPc);
    }

    // Tier 4: altered dominants, upper structures, and occasional tritone
    // substitution.
    let root = chord.rootPc;
    if (fn === "D" || q === "7") {
      if (rng() < 0.22) {
        root = mod12(root + 6);
        q = "13#11";
      } else {
        q = choice(["7b9", "7#9", "7#11", "7b13"]);
      }
    } else if (q.startsWith("min")) {
      q = choice(["min11", "min13"]);
    } else {
      q = choice(["maj7#11", "maj13"]);
    }
    return chordSymbol(root, q, chord.bassPc);
  }

  return {
    choose,
    realize,
    setKey,
    setComplexity,
    setGravity,
    get level() {
      return level();
    },
  };
}

module.exports = { createHarmonyPlanner };
