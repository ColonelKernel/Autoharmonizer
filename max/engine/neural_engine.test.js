"use strict";

/**
 * neural_engine.test.js — assertions for the sampling engine's resolve /
 * masking / session / fallback logic.
 * Run with:  node neural_engine.test.js
 * Exits non-zero on any failure. No external test framework.
 *
 * Uses two backends: a deterministic MOCK (crafted logits, so we can pin down
 * masking / exclude-input / reset behavior exactly) and the real pure-JS
 * backend loaded from data/ (so resolve paths and seeded determinism are
 * exercised end-to-end against actual weights).
 */

const fs = require("fs");
const path = require("path");

const { createNeuralEngine, maskedSoftmax } = require("./neural_engine.js");
const { createJsBackend } = require("./neural_backend_js.js");
const { loadVocab } = require("./vocab.js");
const { makeRng } = require("./rng.js");
const { toJazznet, fromJazznet } = require("./notation.js");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const vocab = loadVocab(path.join(DATA_DIR, "jazznet", "vocab.json"));

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, extra) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(name + (extra ? "  -> " + extra : ""));
  }
}

// A backend that always returns the same crafted logits (a huge spike at index
// K) plus an opaque non-null hidden so the engine's "fresh vs carried" branch is
// exercised. Only the sampling-step logits matter; BOS-prime and auto-feed
// steps reuse the same array harmlessly.
function mockSpikeBackend(K, vocabSize) {
  const logits = new Float32Array(vocabSize); // all zero except the spike
  logits[K] = 100;
  return {
    kind: "js",
    model: "rnn",
    calls: [],
    async init() {},
    zeroHidden() {
      return null; // engine treats null hidden as "fresh"; wrap so step returns non-null
    },
    async step(idx, hidden) {
      this.calls.push({ idx, fresh: hidden === null });
      return { logits, hidden: { tag: "h" } };
    },
  };
}

const K = vocab.chordIndex("A:7"); // a concrete non-special index used by the mock
const K_LABEL = "A:7";

async function main() {
  // --- resolve paths (real backend) --------------------------------------
  const jsBackend = createJsBackend({ model: "rnn", dataDir: DATA_DIR });
  await jsBackend.init();

  {
    // direct hit: a natural-spelled chord already in the vocab.
    const eng = createNeuralEngine({ vocab, backend: jsBackend, rng: makeRng(7) });
    const r = await eng.next("A:7");
    check("resolve direct hit -> no fallback", r.fallbackUsed === false, JSON.stringify(r));
    check("resolve direct hit -> string output", typeof r.output === "string" && r.output.length > 0, r.output);
  }
  {
    // simplify hit: "Cmaj7" isn't a vocab label but simplifies to "C:maj7".
    const eng = createNeuralEngine({ vocab, backend: jsBackend, rng: makeRng(7) });
    const r = await eng.next("Cmaj7");
    check("resolve simplify hit -> no fallback", r.fallbackUsed === false, JSON.stringify(r));
    check("resolve simplify hit -> string output", typeof r.output === "string" && r.output.length > 0, r.output);
  }
  {
    // "C" is a bare note -> Invalid/No Chord -> echo_input fallback (default).
    const eng = createNeuralEngine({ vocab, backend: jsBackend, rng: makeRng(7) });
    const r = await eng.next("C");
    check("unresolved 'C' -> echo_input output", r.output === "C", r.output);
    check("unresolved 'C' -> fallbackUsed", r.fallbackUsed === true, JSON.stringify(r));
    check("unresolved 'C' -> error set", typeof r.error === "string" && r.error.length > 0, r.error);
  }

  // --- masking (maskedSoftmax directly) ----------------------------------
  {
    // Random logits with specials spiked; masking must zero them regardless.
    const n = vocab.vocabSize;
    const logits = new Float32Array(n);
    for (let i = 0; i < n; i++) logits[i] = Math.sin(i) * 3;
    logits[vocab.padIdx] = 50;
    logits[vocab.bosIdx] = 50;
    logits[vocab.eosIdx] = 50;
    const probs = maskedSoftmax(logits, 1.5, vocab, null);
    check("mask: pad prob 0", probs[vocab.padIdx] === 0);
    check("mask: bos prob 0", probs[vocab.bosIdx] === 0);
    check("mask: eos prob 0", probs[vocab.eosIdx] === 0);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += probs[i];
    check("mask: sum approx 1", Math.abs(sum - 1) < 1e-9, sum);

    const excl = new Set([K]);
    const probs2 = maskedSoftmax(logits, 1.5, vocab, excl);
    check("mask: excluded index prob 0", probs2[K] === 0);
    let sum2 = 0;
    for (let i = 0; i < n; i++) sum2 += probs2[i];
    check("mask: sum approx 1 with exclude", Math.abs(sum2 - 1) < 1e-9, sum2);
  }

  // --- exclude-input only on the FIRST session step ----------------------
  {
    const mock = mockSpikeBackend(K, vocab.vocabSize);
    const eng = createNeuralEngine({
      vocab,
      backend: mock,
      rng: makeRng(1),
      sessionMode: "session",
    });
    // Step 1 (fresh): distribution peaks at K but K==input is excluded -> not K.
    const r1 = await eng.next(K_LABEL);
    check("session step1 excludes input -> output != input", r1.output !== K_LABEL, r1.output);
    // Step 2 (carried): exclude no longer applies; peak at K -> output == K.
    const r2 = await eng.next(K_LABEL);
    check("session step2 does NOT exclude -> output == input", r2.output === K_LABEL, r2.output);
  }

  // --- session reset at maxSteps + reset re-applies exclude ---------------
  {
    const mock = mockSpikeBackend(K, vocab.vocabSize);
    const eng = createNeuralEngine({
      vocab,
      backend: mock,
      rng: makeRng(1),
      sessionMode: "session",
      maxSteps: 2,
    });
    const a = await eng.next(K_LABEL); // fresh, excl -> != K, step 1
    check("maxSteps: step count 1", eng.sessionStatus()[1] === 1, JSON.stringify(eng.sessionStatus()));
    const b = await eng.next(K_LABEL); // carried, -> == K, step 2
    check("maxSteps: step count 2", eng.sessionStatus()[1] === 2);
    check("maxSteps: pre-cap carried output == input", b.output === K_LABEL, b.output);
    const c = await eng.next(K_LABEL); // userSteps>=2 -> reset -> fresh again
    check("maxSteps: reset drops step count to 1", eng.sessionStatus()[1] === 1, JSON.stringify(eng.sessionStatus()));
    check("maxSteps: after reset exclude re-applies -> output != input", c.output !== K_LABEL, c.output);
    check("session status label reflects mode", eng.sessionStatus()[0] === "session", eng.sessionStatus()[0]);
  }

  // --- resetSession() clears ---------------------------------------------
  {
    const mock = mockSpikeBackend(K, vocab.vocabSize);
    const eng = createNeuralEngine({ vocab, backend: mock, rng: makeRng(1), sessionMode: "session" });
    await eng.next(K_LABEL);
    await eng.next(K_LABEL);
    check("resetSession precondition steps > 0", eng.sessionStatus()[1] > 0);
    eng.resetSession();
    check("resetSession clears step count", eng.sessionStatus()[1] === 0);
    // After reset the next step is fresh again -> exclude applies.
    const r = await eng.next(K_LABEL);
    check("resetSession -> fresh step excludes input", r.output !== K_LABEL, r.output);
  }

  // --- stateless mode status + no session advance ------------------------
  {
    const eng = createNeuralEngine({ vocab, backend: jsBackend, rng: makeRng(3), sessionMode: "stateless" });
    check("stateless status is ['stateless',0]", eng.sessionStatus()[0] === "stateless" && eng.sessionStatus()[1] === 0);
    await eng.next("A:7");
    check("stateless does not advance step", eng.sessionStatus()[1] === 0);
  }

  // --- deterministic with a seeded rng (real backend) --------------------
  {
    async function run(seed) {
      const eng = createNeuralEngine({ vocab, backend: jsBackend, rng: makeRng(seed), sessionMode: "session" });
      const out = [];
      for (const ch of ["A:7", "C:maj7", "D:min7", "G:7", "A:7"]) {
        out.push((await eng.next(ch)).output);
      }
      return out;
    }
    const a = await run(9999);
    const b = await run(9999);
    check("seeded rng deterministic", JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) + " vs " + JSON.stringify(b));
    const d = await run(1234);
    check("different seed differs (sanity)", JSON.stringify(a) !== JSON.stringify(d));
  }

  // --- all four fallback policies (unresolved chord "C") -----------------
  {
    const mock = mockSpikeBackend(K, vocab.vocabSize); // unused: resolve fails first
    const mk = (fallback) =>
      createNeuralEngine({ vocab, backend: mock, rng: makeRng(5), fallback });

    const echo = await mk("echo_input").next("C");
    check("fallback echo_input -> echoes input", echo.output === "C" && echo.fallbackUsed === true, JSON.stringify(echo));

    const err = await mk("error_only").next("C");
    check("fallback error_only -> null output + error", err.output === null && typeof err.error === "string" && err.fallbackUsed === true, JSON.stringify(err));

    const top = await mk("global_top").next("C");
    // first non-special label in vocab index order (pad,bos,eos occupy 0..2).
    const firstReal = vocab.idxToChord.find((l) => l !== "pad" && l !== "<BOS>" && l !== "<EOS>");
    check("fallback global_top -> first vocab label", top.output === fromJazznet(firstReal) && top.fallbackUsed === true, top.output + " expected " + fromJazznet(firstReal));

    const rnd = await mk("random_source").next("C");
    const isNonSpecialLabel = vocab.idxToChord.includes(toJazznet(rnd.output)) && !["pad", "<BOS>", "<EOS>"].includes(rnd.output);
    check("fallback random_source -> some non-special label", isNonSpecialLabel && rnd.fallbackUsed === true, rnd.output);

    // Vocab labels are JazzNet-spelled ('E-:min'); anything the engine returns
    // must have crossed back to project spelling ('Eb:min') like registry.py's
    // from_jazznet() does. Sweep every seed so the ~36 dash-flat labels in the
    // 118-token vocab are actually drawn, not just the sharp ones.
    let dashLeaks = 0;
    for (let seed = 0; seed < 400; seed++) {
      const out = (await createNeuralEngine({ vocab, backend: mock, rng: makeRng(seed), fallback: "random_source" }).next("C")).output;
      if (out.split(":")[0].indexOf("-") !== -1) dashLeaks++;
    }
    check("fallback random_source never leaks JazzNet dash-flat spelling", dashLeaks === 0, `${dashLeaks} leaked`);
  }

  // --- setSessionMode / setTemperature callable --------------------------
  {
    const eng = createNeuralEngine({ vocab, backend: jsBackend, rng: makeRng(1) });
    check("default mode is auto", eng.sessionStatus()[0] === "auto");
    eng.setSessionMode("stateless");
    check("setSessionMode -> stateless", eng.sessionStatus()[0] === "stateless");
    eng.setSessionMode("session");
    check("setSessionMode -> session", eng.sessionStatus()[0] === "session");
    eng.setSessionMode("bogus");
    check("setSessionMode ignores invalid", eng.sessionStatus()[0] === "session");
    eng.setTemperature(0.6); // just must not throw
    check("setTemperature callable", true);
  }

  if (failed > 0) {
    console.error(`neural_engine: ${failed} FAILED, ${passed} passed`);
    for (const f of failures) console.error("  FAIL " + f);
    process.exit(1);
  }
  console.log(`neural_engine: ${passed} tests passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
