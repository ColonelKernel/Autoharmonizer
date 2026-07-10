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
 * Backend choice is made ONCE at init(): onnxruntime-node if it loads, else the
 * pure-JS forward pass. Both models are loaded eagerly (1.3 MB of ONNX graph,
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

// Mirrors python/src/config.py. Kept as literals rather than imported from a
// shared JSON: these are protocol constants, and a drift here should break the
// parity tests loudly rather than be silently inherited.
const MODELS = ["markov", "rnn", "lstm"];
const DEFAULT_MODEL = "markov";
const SESSION_MODES = ["auto", "stateless", "session"];
const ADVENTURE_TAU_MIN = 0.6;
const ADVENTURE_TAU_MAX = 1.8;
const DEFAULT_COLOR = 0.5;
const DEFAULT_ADVENTURE = 0.35;
const DEFAULT_GRAVITY = 0.0;
const DEFAULT_KEY = "C:maj";
const DEFAULT_FALLBACK = "echo_input";
const DEFAULT_NEURAL_TEMPERATURE = 1.5;
const DEFAULT_SESSION_MAX_STEPS = 64;
const DEFAULT_SESSION_AUTO_FEED = true;
const DEFAULT_NEURAL_EXCLUDE_INPUT = true;

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
 * createLocalEngine({dataDir, post, rng}) -> engine facade.
 *
 * `post` is an optional logger (Max.post). `rng` is an optional () => [0,1)
 * stream shared by every sampler, so a test can make the whole device
 * deterministic without reaching into the modules.
 */
function createLocalEngine(opts) {
  opts = opts || {};
  const dataDir = opts.dataDir || path.join(__dirname, "..", "..", "data");
  const post = opts.post || (() => {});
  const rng = opts.rng || Math.random;

  const CORPORA_PATH = path.join(dataDir, "markov_corpora_t.json");
  const VOCAB_PATH = path.join(dataDir, "jazznet", "vocab.json");
  const PHRASE_PATH = path.join(dataDir, "phrase_model_jazznet.json");

  // --- dial state (survives a reload/restart, like the Python service) ------
  let color = DEFAULT_COLOR;
  let adventure = DEFAULT_ADVENTURE;
  let gravity = DEFAULT_GRAVITY;
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
   */
  async function loadBackends() {
    try {
      const r = createOnnxBackend({ model: "rnn", dataDir });
      await r.init();
      const l = createOnnxBackend({ model: "lstm", dataDir });
      await l.init();
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

    // The phrase model is optional: without it the walk engines still play.
    try {
      phrase = createPhraseEngine(PHRASE_PATH, rng);
    } catch (err) {
      phrase = null;
      warnings.push(`phrase: ${err.message || err}`);
      post(`phrase model unavailable: ${err.message || err}`);
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

  // --- sampling ------------------------------------------------------------
  /** Always a promise: the neural path is async, and callers must not care. */
  async function sample(rawInput) {
    const chord = String(rawInput == null ? "" : rawInput).trim();
    if (!chord) {
      return { output: null, error: "empty chord input", fallbackUsed: false };
    }
    if (activeModel === "markov") {
      if (!markov) return { output: null, error: "markov engine not loaded", fallbackUsed: true };
      return markov.sample(chord);
    }
    const eng = neuralEngineFor(activeModel);
    if (!eng) {
      return { output: null, error: `${activeModel} engine unavailable`, fallbackUsed: true };
    }
    try {
      return await eng.next(chord);
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
  }

  function pushTemperature(dialValue) {
    neuralTemperature = dialToTemperature(dialValue);
    if (rnnEngine) rnnEngine.setTemperature(neuralTemperature);
    if (lstmEngine) lstmEngine.setTemperature(neuralTemperature);
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
      if (name !== "markov" && !neuralEngineFor(name)) {
        return { ok: false, error: `failed to load ${name}: engine unavailable` };
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

    /** [label, step] for the panel: "stateless 0" or "session <n>". */
    sessionStatus() {
      if (!effectiveSession()) return ["stateless", 0];
      const eng = neuralEngineFor(activeModel);
      return ["session", eng ? eng.sessionStatus()[1] : 0];
    },

    // --- dials. Adventure and Spice also drive the neural temperature, so one
    // knob spices the Markov blend and the RNN/LSTM sampling together.
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
    setGravity(v) { gravity = Number(v); if (markov) markov.setGravity(gravity); },
    setKey(v) {
      const s = String(v == null ? "" : v).trim();
      key = s || DEFAULT_KEY;
      if (markov) markov.setKey(key);
    },
    currentKey: () => key,
  };
}

module.exports = { createLocalEngine, dialToTemperature, MODELS, SESSION_MODES };
