"use strict";

/**
 * local_engine.js — the in-process replacement for the Python OSC service.
 *
 * markov_osc.js sends /chord/input over UDP and waits for /chord/output; this
 * facade answers the same questions inside Node. It owns exactly what
 * python/src/engines/registry.py + osc_service.py owned: which model is active,
 * the neural session, the dial state, and the fallback when a chord resolves to
 * nothing. Everything below it (corpus/blend/neural/phrase) is already ported
 * and tested against Python fixtures.
 *
 * Backend choice is made ONCE at init(): onnxruntime-node if it loads IN TIME,
 * else the pure-JS forward pass. Both models are loaded eagerly (1.3 MB of ONNX graph,
 * or 1.7 MB of base64 weights) so that switching Model on stage is instant and
 * cannot surprise a performer with a load failure mid-set — the failure, if it
 * comes, happens once at device load and lights the panel red.
 *
 * NOTHING here touches the network, spawns a process, or requires Python.
 */

const path = require("path");

const { loadVocab } = require("./vocab.js");
const { loadCorpora } = require("./corpus.js");
const { createMarkovEngine } = require("./markov_engine.js");
const { createNeuralEngine } = require("./neural_engine.js");
const { createPhraseEngine } = require("./phrase_engine.js");
const { createOnnxBackend } = require("./neural_backend_onnx.js");
const { createJsBackend } = require("./neural_backend_js.js");
const { createNgramEngine } = require("./ngram_engine.js");
const { createHarmonyPlanner } = require("./planner.js");
const { reduceForNeural } = require("./theory.js");
const { fromJazznet } = require("./notation.js");

// Mirrors python/src/config.py. Kept as literals rather than imported from a
// shared JSON: these are protocol constants, and a drift here should break the
// parity tests loudly rather than be silently inherited.
const MODELS = ["markov", "rnn", "lstm", "ngram"];
const DEFAULT_MODEL = "markov";
const SESSION_MODES = ["auto", "stateless", "session"];
const ADVENTURE_TAU_MIN = 0.6;
const ADVENTURE_TAU_MAX = 1.8;
const DEFAULT_COLOR = 0.5;
const DEFAULT_ADVENTURE = 0.35;
const DEFAULT_GRAVITY = 0.0;
// v4 harmony-complexity control, default 0.5 = tier 2, the "compatibility" tier
// whose realize() returns the model's own token unchanged (see planner.realize).
const DEFAULT_COMPLEXITY = 0.5;
const DEFAULT_KEY = "C:maj";
const DEFAULT_FALLBACK = "echo_input";
const DEFAULT_NEURAL_TEMPERATURE = 1.5;
const DEFAULT_SESSION_MAX_STEPS = 64;
const DEFAULT_SESSION_AUTO_FEED = true;
const DEFAULT_NEURAL_EXCLUDE_INPUT = true;

// Cold-load ceiling for the native ONNX runtime. Two graphs totalling 1.3 MB
// load in well under a second, so ten of them means the addon is wedged.
const ONNX_INIT_TIMEOUT_MS = 10000;

/**
 * Reject after `ms` if `promise` has not settled.
 *
 * The timer is deliberately NOT unref'd. When the runtime wedges, this timer is
 * the only live handle: unref it and Node drains the loop and exits before the
 * timeout can fire, which is the very hang this guards against. The winning path
 * clears it in `finally`, so it never holds the process open for real work.
 * Promise.race attaches a handler to `promise`, so a late rejection from the
 * abandoned loser is never an unhandled rejection.
 */
function withTimeout(promise, ms, what) {
  let timer = null;
  const clock = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, clock]).finally(() => clearTimeout(timer));
}

/**
 * Adventure/Spice dial (0..1) -> JazzNet softmax temperature, verbatim from
 * registry.set_neural_temperature_from_dial: 0 -> 0.6, 0.5 -> 1.5, 1 -> 2.4.
 */
function dialToTemperature(value) {
  let v = Number(value);
  if (!Number.isFinite(v)) return DEFAULT_NEURAL_TEMPERATURE;
  v = v < 0 ? 0 : v > 1 ? 1 : v;
  return ADVENTURE_TAU_MIN + v * (ADVENTURE_TAU_MAX + 0.6 - ADVENTURE_TAU_MIN);
}

/**
 * createLocalEngine({dataDir, post, rng, onnxInitTimeoutMs}) -> engine facade.
 *
 * `post` is an optional logger (Max.post). `rng` is an optional () => [0,1)
 * stream shared by every sampler, so a test can make the whole device
 * deterministic without reaching into the modules. `onnxInitTimeoutMs` exists
 * so a test can prove the wedged-runtime fallback without waiting ten seconds.
 */
function createLocalEngine(opts) {
  opts = opts || {};
  const dataDir = opts.dataDir || path.join(__dirname, "..", "..", "data");
  const post = opts.post || (() => {});
  const rng = opts.rng || Math.random;
  const onnxInitTimeoutMs = Number(opts.onnxInitTimeoutMs) > 0 ? Number(opts.onnxInitTimeoutMs) : ONNX_INIT_TIMEOUT_MS;

  const CORPORA_PATH = path.join(dataDir, "markov_corpora_t.json");
  const VOCAB_PATH = path.join(dataDir, "jazznet", "vocab.json");
  const PHRASE_PATH = path.join(dataDir, "phrase_model_jazznet.json");
  const NGRAM_PATH = path.join(dataDir, "theory_ngram.json");

  // --- dial state (survives a reload/restart, like the Python service) ------
  let color = DEFAULT_COLOR;
  let adventure = DEFAULT_ADVENTURE;
  let gravity = DEFAULT_GRAVITY;
  let complexity = DEFAULT_COMPLEXITY;
  let key = DEFAULT_KEY;
  let sessionMode = "auto";
  let activeModel = DEFAULT_MODEL;
  // Neural engines start at the configured default and only follow the dial
  // once it actually moves — matching Python, where a model loaded later starts
  // from --neural-temperature rather than from the dial's current position.
  let neuralTemperature = DEFAULT_NEURAL_TEMPERATURE;

  // --- loaded artifacts ----------------------------------------------------
  let markov = null;
  let phrase = null;
  let vocab = null;
  let rnnEngine = null;
  let lstmEngine = null;
  let ngramEngine = null;
  // The v4 theory layer: one HarmonyPlanner is the candidate_selector for every
  // model (complexity mask + functional rerank) and realizes each surviving
  // token to the requested complexity tier. Null only if planner.js failed.
  let planner = null;
  let kind = null; // "onnx" | "js"
  let state = "loading"; // "loading" | "up" | "down"
  let statusWords = ["loading"];
  let lastError = null;
  const warnings = [];

  function neuralEngineFor(name) {
    return name === "rnn" ? rnnEngine : name === "lstm" ? lstmEngine : null;
  }

  /**
   * Load the ONNX graphs, or fall back to the pure-JS forward pass. Both models
   * or neither: a half-loaded pair would let Model=rnn work and Model=lstm
   * throw mid-performance.
   *
   * The ONNX attempt races a clock, because only a REJECTION reaches the catch
   * below. A native session that wedges rather than throwing — the classic
   * symptom of an unsupported CPU — never rejects, so init() would stay pending
   * forever, the panel amber on "loading models", and this fallback unreachable
   * on exactly the machines it exists to serve. A false timeout costs only
   * speed: the JS pass matches ONNX to ~5e-6.
   */
  async function loadBackends() {
    try {
      const r = createOnnxBackend({ model: "rnn", dataDir });
      const l = createOnnxBackend({ model: "lstm", dataDir });
      await withTimeout(
        (async () => {
          await r.init();
          await l.init();
        })(),
        onnxInitTimeoutMs,
        "onnx backend init",
      );
      return { kind: "onnx", rnn: r, lstm: l };
    } catch (onnxErr) {
      post(`onnx backend unavailable (${onnxErr.message || onnxErr}); using the pure-JS forward pass`);
      warnings.push(`onnx: ${onnxErr.message || onnxErr}`);
      const r = createJsBackend({ model: "rnn", dataDir });
      await r.init();
      const l = createJsBackend({ model: "lstm", dataDir });
      await l.init();
      return { kind: "js", rnn: r, lstm: l };
    }
  }

  function wrapNeural(backend) {
    return createNeuralEngine({
      vocab,
      backend,
      rng,
      temperature: neuralTemperature,
      excludeInput: DEFAULT_NEURAL_EXCLUDE_INPUT,
      sessionMode,
      maxSteps: DEFAULT_SESSION_MAX_STEPS,
      autoFeed: DEFAULT_SESSION_AUTO_FEED,
      fallback: DEFAULT_FALLBACK,
    });
  }

  async function init() {
    state = "loading";
    statusWords = ["loading"];
    lastError = null;
    warnings.length = 0;
    kind = null;

    // The Markov chain is the device's floor: if the corpora fail to load there
    // is no usable engine at all, so this is the only hard error.
    try {
      const corpora = loadCorpora(CORPORA_PATH);
      markov = createMarkovEngine({
        corpora, rng, fallback: DEFAULT_FALLBACK, color, adventure, key, gravity,
      });
    } catch (err) {
      markov = null;
      state = "down";
      lastError = `corpora: ${err.message || err}`;
      statusWords = ["no", "corpora"];
      return { ok: false, error: lastError };
    }

    // The theory planner is the always-on candidate selector + realizer. It has
    // no external assets (pure logic over theory.js), so it should never fail;
    // guard anyway so a planner fault degrades to raw model sampling rather than
    // taking the device down.
    try {
      planner = createHarmonyPlanner({ key, complexity, gravity, rng });
    } catch (err) {
      planner = null;
      warnings.push(`planner: ${err.message || err}`);
      post(`harmony planner unavailable (raw model sampling): ${err.message || err}`);
    }

    // The phrase model is optional: without it the walk engines still play.
    try {
      phrase = createPhraseEngine(PHRASE_PATH, rng);
    } catch (err) {
      phrase = null;
      warnings.push(`phrase: ${err.message || err}`);
      post(`phrase model unavailable: ${err.message || err}`);
    }

    // The n-gram model is optional too (it is a fourth Model choice, not a floor).
    try {
      ngramEngine = createNgramEngine({
        modelPath: NGRAM_PATH, fallback: DEFAULT_FALLBACK, rng, temperature: neuralTemperature,
      });
    } catch (err) {
      ngramEngine = null;
      warnings.push(`ngram: ${err.message || err}`);
      post(`n-gram model unavailable: ${err.message || err}`);
      if (activeModel === "ngram") activeModel = "markov";
    }

    // Neural is optional too: markov + phrase remain usable if it fails.
    try {
      vocab = loadVocab(VOCAB_PATH);
      const b = await loadBackends();
      kind = b.kind;
      rnnEngine = wrapNeural(b.rnn);
      lstmEngine = wrapNeural(b.lstm);
    } catch (err) {
      rnnEngine = null;
      lstmEngine = null;
      kind = null;
      warnings.push(`neural: ${err.message || err}`);
      post(`neural engines unavailable: ${err.message || err}`);
      if (activeModel !== "markov") activeModel = "markov";
    }

    state = "up";
    // Panel readout is ~18 chars wide; say which forward pass is actually live.
    statusWords = kind === "onnx" ? ["onnx", "ready"]
      : kind === "js" ? ["js", "fallback"]
      : ["markov", "only"];
    return { ok: true, kind, warnings: warnings.slice() };
  }

  /** Re-read the JSON assets (corpora + phrase model); keep the loaded weights. */
  function reload() {
    try {
      const corpora = loadCorpora(CORPORA_PATH);
      markov = createMarkovEngine({
        corpora, rng, fallback: DEFAULT_FALLBACK, color, adventure, key, gravity,
      });
    } catch (err) {
      return { ok: false, error: `corpora: ${err.message || err}` };
    }
    try {
      phrase = createPhraseEngine(PHRASE_PATH, rng);
    } catch (err) {
      phrase = null;
      return { ok: true, warning: `phrase: ${err.message || err}` };
    }
    return { ok: true };
  }

  // --- theory candidate selectors (mirror registry._select_runtime/_select_neural)
  // markov + ngram already hand the planner RUNTIME-spelled candidates.
  function selectRuntime(source, choices, name) {
    return planner.choose(source, choices, name);
  }
  // rnn/lstm hand the planner JAZZNET-spelled candidates; convert to runtime for
  // the theory decision, then map the chosen chord BACK to its JazzNet token so
  // the neural session commits the right index.
  function selectNeural(cjSource, jzCandidates, name) {
    const runtime = jzCandidates.map(([s, p]) => [fromJazznet(s), p]);
    const [selRuntime, prob] = planner.choose(fromJazznet(cjSource), runtime, name);
    for (const [s] of jzCandidates) {
      if (fromJazznet(s) === selRuntime) return [s, prob];
    }
    throw new Error(`planner selected a token outside the ${name} vocabulary: ${selRuntime}`);
  }

  /**
   * Apply the complexity-tier surface realization to an output.
   *
   * `alsoFallback` mirrors an INTENTIONAL inconsistency in the reference:
   * registry.py realizes the markov and ngram branches only when
   * `not fallback_used`, but the NEURAL branch realizes every non-None output
   * (fallbacks included). Reproduced exactly rather than unified, so the JS
   * device matches the Python reference chord-for-chord.
   */
  function realizeMaybe(res, alsoFallback) {
    if (planner && res && res.output != null && (alsoFallback || !res.fallbackUsed)) {
      return Object.assign({}, res, { output: planner.realize(res.output) });
    }
    return res;
  }

  // --- sampling ------------------------------------------------------------
  /** Always a promise: the neural path is async, and callers must not care. */
  async function sample(rawInput) {
    const chord = String(rawInput == null ? "" : rawInput).trim();
    if (!chord) {
      return { output: null, error: "empty chord input", fallbackUsed: false };
    }
    const selector = planner ? selectRuntime : null;

    if (activeModel === "markov") {
      if (!markov) return { output: null, error: "markov engine not loaded", fallbackUsed: true };
      // markov: realize only a real (non-fallback) selection (registry.py:320).
      return realizeMaybe(markov.sample(chord, { candidateSelector: selector }), false);
    }

    if (activeModel === "ngram") {
      if (!ngramEngine) return { output: null, error: "ngram engine unavailable", fallbackUsed: true };
      try {
        const res = ngramEngine.sample(chord, { session: effectiveSession(), candidateSelector: selector });
        return realizeMaybe(res, false); // ngram: non-fallback only (registry.py:329)
      } catch (err) {
        return { output: null, error: `ngram sample failed: ${err.message || err}`, fallbackUsed: true };
      }
    }

    const eng = neuralEngineFor(activeModel);
    if (!eng) {
      return { output: null, error: `${activeModel} engine unavailable`, fallbackUsed: true };
    }
    try {
      // Reduce rich v4 qualities to JazzNet's 7-quality alphabet before the
      // neural vocab (v4 registry does reduce_for_neural then to_jazznet); the
      // engine's own toJazznet handles the spelling.
      const structural = reduceForNeural(chord);
      const res = await eng.next(structural, {
        candidateSelector: planner ? selectNeural : null,
        modelName: activeModel,
      });
      // neural: registry.py:345 realizes EVERY non-null output, fallbacks too.
      return realizeMaybe(res, true);
    } catch (err) {
      // A malformed token must never take the device down (osc_service.py logs
      // and returns an error result rather than letting the handler throw).
      return { output: null, error: `${activeModel} sample failed: ${err.message || err}`, fallbackUsed: true };
    }
  }

  /** [[chordSymbol, durationBeats], ...] summing to bars*4. Throws if unloaded. */
  function generatePhrase(o) {
    if (!phrase) {
      throw new Error("phrase model not loaded; run scripts/build_phrase_model.py");
    }
    o = o || {};
    const bars = Math.trunc(Number(o.bars));
    if (!Number.isFinite(bars) || bars < 1 || bars > 64) {
      throw new Error(`bars out of range: ${o.bars}`);
    }
    return phrase.generate(bars, o.key || key, {
      seedChord: o.seedChord || null,
      cadence: o.cadence != null ? Number(o.cadence) : 1.0,
      seed: o.seed != null ? o.seed : null,
    });
  }

  // --- session (mirrors registry.py's effective-session table) -------------
  function effectiveSession() {
    if (activeModel === "markov") return false;
    if (sessionMode === "stateless") return false;
    return true; // "auto" or "session" -> stateful for rnn/lstm
  }

  function resetSession() {
    if (rnnEngine) rnnEngine.resetSession();
    if (lstmEngine) lstmEngine.resetSession();
    if (ngramEngine) ngramEngine.resetSession();
  }

  function pushTemperature(dialValue) {
    neuralTemperature = dialToTemperature(dialValue);
    if (rnnEngine) rnnEngine.setTemperature(neuralTemperature);
    if (lstmEngine) lstmEngine.setTemperature(neuralTemperature);
    if (ngramEngine) ngramEngine.setTemperature(neuralTemperature);
  }

  return {
    init,
    reload,
    sample,
    generatePhrase,

    state: () => state,
    kind: () => kind,
    statusWords: () => statusWords.slice(),
    lastError: () => lastError,
    warnings: () => warnings.slice(),
    hasPhrase: () => phrase !== null,
    activeModel: () => activeModel,

    setModel(name) {
      if (MODELS.indexOf(name) === -1) return { ok: false, error: `invalid model: ${name}` };
      if ((name === "rnn" || name === "lstm") && !neuralEngineFor(name)) {
        return { ok: false, error: `failed to load ${name}: engine unavailable` };
      }
      if (name === "ngram" && !ngramEngine) {
        return { ok: false, error: "failed to load ngram: engine unavailable" };
      }
      activeModel = name;
      resetSession(); // fresh context each time a model is selected
      return { ok: true };
    },

    setSessionMode(mode) {
      const normalized = String(mode == null ? "" : mode).trim().toLowerCase();
      if (normalized === "reset") {
        resetSession();
        return { ok: true };
      }
      if (SESSION_MODES.indexOf(normalized) === -1) {
        return { ok: false, error: `invalid session mode: ${mode}` };
      }
      sessionMode = normalized;
      if (rnnEngine) rnnEngine.setSessionMode(normalized);
      if (lstmEngine) lstmEngine.setSessionMode(normalized);
      if (normalized === "stateless") resetSession();
      return { ok: true };
    },

    resetSession,

    /** [label, step] for the panel: "stateless 0" or "session <n>". ngram's
     *  depth is its chord-history length (registry.session_status). */
    sessionStatus() {
      if (!effectiveSession()) return ["stateless", 0];
      if (activeModel === "ngram") return ["session", ngramEngine ? ngramEngine.history.length : 0];
      const eng = neuralEngineFor(activeModel);
      return ["session", eng ? eng.sessionStatus()[1] : 0];
    },

    // --- dials. Adventure and Spice also drive the neural temperature, so one
    // knob spices the Markov blend and the RNN/LSTM/ngram sampling together.
    setColor(v) { color = Number(v); if (markov) markov.setColor(color); },
    setAdventure(v) {
      adventure = Number(v);
      if (markov) markov.setAdventure(adventure);
      pushTemperature(adventure);
    },
    setSpice(v) {
      color = Number(v);
      adventure = Number(v);
      if (markov) markov.setSpice(color);
      pushTemperature(adventure);
    },
    setGravity(v) {
      gravity = Number(v);
      if (markov) markov.setGravity(gravity);
      if (planner) planner.setGravity(gravity);
    },
    // v4 Harmony Complexity: the theory tier the planner masks/realizes toward.
    setComplexity(v) {
      complexity = Number(v);
      if (planner) planner.setComplexity(complexity);
    },
    complexity: () => complexity,
    setKey(v) {
      const s = String(v == null ? "" : v).trim();
      key = s || DEFAULT_KEY;
      if (markov) markov.setKey(key);
      if (planner) planner.setKey(key);
    },
    currentKey: () => key,
  };
}

module.exports = { createLocalEngine, dialToTemperature, MODELS, SESSION_MODES };
