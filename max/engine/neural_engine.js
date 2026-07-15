"use strict";

/**
 * neural_engine.js — the sampling engine that turns a chord symbol into the
 * model's suggested next chord. It wraps a backend (ONNX or pure-JS, injected)
 * with the exact resolve / stateless / session / sampling / fallback logic ported
 * from python/src/engines/neural_sampler.py + neural_session.py (see GROUP B
 * spec). The backend is model-agnostic; this file owns everything above it.
 *
 * Notation flows through here: incoming symbols are in this project's spelling
 * (Bb), the vocab and model speak JazzNet's (B-), so we toJazznet() before
 * lookup and fromJazznet() the reply before returning it.
 */

const { toJazznet, fromJazznet } = require("./notation.js");
const { simplifyChord } = require("./chord_simplifier.js");

const SESSION_MODES = new Set(["auto", "stateless", "session"]);
const SPECIAL_LABELS = new Set(["pad", "<BOS>", "<EOS>"]);

/**
 * maskedSoftmax(logits, tau, vocab, excludeSet) -> Float64Array probs.
 * Port of apply_sampling_distribution: temperature softmax, then zero out the
 * pad/bos/eos specials (always) and any excluded index, then renormalize so the
 * surviving mass sums to 1. Throws if nothing survives. Exported for direct
 * masking assertions in the test.
 */
function maskedSoftmax(logits, tau, vocab, excludeSet) {
  const n = logits.length;
  // Subtract max for numerical stability (does not change the distribution,
  // matches torch's stable softmax).
  let mx = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = logits[i] / tau;
    if (v > mx) mx = v;
  }
  const probs = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const e = Math.exp(logits[i] / tau - mx);
    probs[i] = e;
    sum += e;
  }
  for (let i = 0; i < n; i++) probs[i] /= sum;

  for (let i = 0; i < n; i++) {
    if (vocab.isSpecial(i) || (excludeSet && excludeSet.has(i))) probs[i] = 0;
  }
  let total = 0;
  for (let i = 0; i < n; i++) total += probs[i];
  if (total <= 0) {
    throw new Error("no valid next token after applying sampling constraints");
  }
  for (let i = 0; i < n; i++) probs[i] /= total;
  return probs;
}

/**
 * createNeuralEngine({vocab, backend, rng, temperature, excludeInput,
 *   sessionMode, maxSteps, autoFeed, fallback}) -> engine.
 *
 * vocab   : loadVocab() result (chordIndex/indexChord/isSpecial/idxToChord/…)
 * backend : createOnnx/JsBackend result, already init()'d by the caller.
 * rng     : () => float in [0,1) (from makeRng), used for inverse-CDF sampling.
 */
function createNeuralEngine({
  vocab,
  backend,
  rng,
  temperature = 1.5,
  excludeInput = true,
  sessionMode = "auto",
  maxSteps = 64,
  autoFeed = true,
  fallback = "echo_input",
}) {
  let tau = Math.max(0.05, Number(temperature));
  let mode = SESSION_MODES.has(sessionMode) ? sessionMode : "auto";

  // Session state, mirroring NeuralSessionState. hidden===null means "fresh":
  // the next session step primes the model with BOS before the user's chord.
  const session = { hidden: null, userSteps: 0, tokenTrace: [] };

  function resetSession() {
    session.hidden = null;
    session.userSteps = 0;
    session.tokenTrace.length = 0;
  }

  // --- resolve a raw symbol to a vocab index (or null) ---------------------
  // Mirrors _resolve_chord: direct hit, else simplify then hit, else null.
  function resolve(cj) {
    let idx = vocab.chordIndex(cj);
    if (idx !== null) return idx;
    const s = simplifyChord(cj);
    if (s === "Invalid/No Chord") return null;
    idx = vocab.chordIndex(s);
    return idx; // may be null if the simplified label isn't in vocab
  }

  // --- sampling ------------------------------------------------------------
  // Port of apply_sampling_distribution + _sample_from_probabilities. Returns a
  // non-special index, or throws Error (caught upstream -> fallback policy).
  function sampleNext(logits, excludeSet) {
    const probs = maskedSoftmax(logits, tau, vocab, excludeSet); // throws if empty
    const n = probs.length;

    // Draw via inverse-CDF, rejecting specials, up to 10 attempts; then argmax.
    for (let attempt = 0; attempt < 10; attempt++) {
      const r = rng();
      let cum = 0;
      let picked = n - 1; // guard against FP drift leaving r just under 1.0
      for (let i = 0; i < n; i++) {
        cum += probs[i];
        if (r < cum) {
          picked = i;
          break;
        }
      }
      if (!vocab.isSpecial(picked)) return picked;
    }
    // Deterministic fallback: highest-probability token.
    let bi = 0;
    let bv = probs[0];
    for (let i = 1; i < n; i++) {
      if (probs[i] > bv) {
        bv = probs[i];
        bi = i;
      }
    }
    if (vocab.isSpecial(bi)) throw new Error("no valid next token in model output");
    return bi;
  }

  // --- fallback policies ---------------------------------------------------
  // Mirrors _apply_fallback. `chord` is the ORIGINAL project-spelled input.
  //
  // Anything drawn from the VOCAB is JazzNet-spelled ('E-:min') and must cross
  // the notation boundary on the way out, exactly as registry.py does by running
  // from_jazznet() over every non-null neural result. echo_input needs no
  // conversion: it returns the caller's own project-spelled symbol.
  function applyFallback(chord) {
    const error = `unknown chord: ${chord}`;
    switch (fallback) {
      case "error_only":
        return { output: null, error, fallbackUsed: true };
      case "echo_input":
        return { output: chord, error, fallbackUsed: true };
      case "global_top": {
        // First non-special label in vocab index order.
        for (let i = 0; i < vocab.idxToChord.length; i++) {
          const label = vocab.idxToChord[i];
          if (!SPECIAL_LABELS.has(label)) {
            return { output: fromJazznet(label), error, fallbackUsed: true };
          }
        }
        return { output: null, error, fallbackUsed: true };
      }
      case "random_source": {
        const choices = [];
        for (let i = 0; i < vocab.idxToChord.length; i++) {
          const label = vocab.idxToChord[i];
          if (!SPECIAL_LABELS.has(label)) choices.push(label);
        }
        const pick = choices[Math.floor(rng() * choices.length)];
        return { output: fromJazznet(pick), error, fallbackUsed: true };
      }
      default:
        throw new Error(`Unsupported fallback policy: ${fallback}`);
    }
  }

  async function stepFromBos(idx) {
    // Prime with BOS from a zeroed hidden, then feed the user's chord — this is
    // the decomposed equivalent of forwarding the sequence [BOS, idx].
    const hBos = (await backend.step(vocab.bosIdx, backend.zeroHidden())).hidden;
    return backend.step(idx, hBos);
  }

  /**
   * Resolve the next token index from logits. With a candidate_selector (v4's
   * HarmonyPlanner via a shim), materialize every valid token as
   * [JazzNet label, prob] (specials and excluded input already zeroed by the
   * masked softmax, so prob>0 excludes them) — mirroring
   * jazznet_inference.candidate_probabilities — hand it to the selector, and map
   * the chosen JazzNet symbol back to its index. Without a selector, the
   * internal multinomial draw is used. Either way an index is returned, so
   * auto-feed and output spelling downstream are identical.
   */
  function chooseNext(logits, excludeSet, selector, modelName, cj) {
    if (!selector) return sampleNext(logits, excludeSet);
    const probs = maskedSoftmax(logits, tau, vocab, excludeSet); // throws if empty
    const cands = [];
    for (let i = 0; i < probs.length; i++) {
      if (!vocab.isSpecial(i) && probs[i] > 0) cands.push([vocab.indexChord(i), probs[i]]);
    }
    const picked = selector(cj, cands, modelName); // [jazznetSymbol, prob]
    const outSym = picked && picked[0];
    const nextIdx = vocab.chordIndex(outSym);
    if (nextIdx === null || vocab.isSpecial(nextIdx)) {
      throw new Error(`selector chose a token outside the ${modelName} vocabulary: ${outSym}`);
    }
    return nextIdx;
  }

  async function next(chordSymbol, opts) {
    const selector = opts && opts.candidateSelector ? opts.candidateSelector : null;
    const modelName = (opts && opts.modelName) || "neural";
    const chord = String(chordSymbol == null ? "" : chordSymbol).trim();
    if (!chord) {
      return { output: null, error: "empty chord input", fallbackUsed: false };
    }

    const cj = toJazznet(chord);
    const idx = resolve(cj);
    if (idx === null) return applyFallback(chord);

    try {
      if (mode === "stateless") {
        const { logits } = await stepFromBos(idx);
        const excludeSet = excludeInput ? new Set([idx]) : null;
        const nextIdx = chooseNext(logits, excludeSet, selector, modelName, cj);
        return { output: fromJazznet(vocab.indexChord(nextIdx)), error: null, fallbackUsed: false };
      }

      // Session mode (auto/session): stateful, hidden carried across calls.
      if (maxSteps > 0 && session.userSteps >= maxSteps) resetSession();

      // exclude-input only bites on the FIRST step of a session (fresh hidden);
      // once state is carried we let the model repeat the input if it wants.
      const excludeSet = excludeInput && session.hidden === null ? new Set([idx]) : null;

      let logits;
      let hAfter;
      if (session.hidden === null) {
        const r = await stepFromBos(idx);
        logits = r.logits;
        hAfter = r.hidden;
      } else {
        const r = await backend.step(idx, session.hidden);
        logits = r.logits;
        hAfter = r.hidden;
      }

      const nextIdx = chooseNext(logits, excludeSet, selector, modelName, cj);
      const output = fromJazznet(vocab.indexChord(nextIdx));

      // Advance session only after a successful sample (fallbacks leave state
      // untouched). autoFeed threads the model's own output back in so the next
      // user chord is conditioned on the full generated trajectory.
      session.hidden = autoFeed ? (await backend.step(nextIdx, hAfter)).hidden : hAfter;
      session.userSteps += 1;
      session.tokenTrace.push(chord, output);

      return { output, error: null, fallbackUsed: false };
    } catch (err) {
      // Sampling produced no valid token: fall back per the configured policy.
      return applyFallback(chord);
    }
  }

  return {
    next,
    setTemperature(t) {
      tau = Math.max(0.05, Number(t));
    },
    setSessionMode(m) {
      const normalized = String(m).trim().toLowerCase();
      if (normalized === "reset") {
        resetSession();
        return;
      }
      if (!SESSION_MODES.has(normalized)) return; // ignore invalid, keep current
      mode = normalized;
      // Switching to stateless clears any carried context (matches registry).
      if (mode === "stateless") resetSession();
    },
    resetSession,
    sessionStatus() {
      if (mode === "stateless") return ["stateless", 0];
      return [mode, session.userSteps];
    },
  };
}

module.exports = { createNeuralEngine, maskedSoftmax };
