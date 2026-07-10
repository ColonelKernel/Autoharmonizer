"use strict";

// ONNX-runtime backend: identical interface to the pure-JS backend but runs the
// exported rnn.onnx / lstm.onnx graphs. onnxruntime-node is an optionalDependency
// (native, may be absent or fail to load on some platforms/node ABIs), so the
// require lives inside a try and surfaces a clean Error instead of crashing the
// host. Callers can then fall back to the JS backend.

const path = require("path");

const HIDDEN = 128;
const N_LAYERS = 2;
const HIDDEN_LEN = N_LAYERS * 1 * HIDDEN; // flattened [2,1,128]

function loadOrt() {
  try {
    // eslint-disable-next-line global-require
    return require("onnxruntime-node");
  } catch (err) {
    throw new Error(`onnxruntime-node unavailable: ${err && err.message ? err.message : err}`);
  }
}

function createOnnxBackend({ model, dataDir }) {
  if (model !== "rnn" && model !== "lstm") {
    throw new Error(`createOnnxBackend: unknown model "${model}"`);
  }
  const rnn = model === "rnn";

  let ort = null;
  let session = null;

  const backend = {
    kind: "onnx",
    model,

    async init() {
      ort = loadOrt();
      const modelPath = path.join(dataDir, "jazznet", "onnx", `${model}.onnx`);
      session = await ort.InferenceSession.create(modelPath);
    },

    zeroHidden() {
      if (rnn) return { h: new Float32Array(HIDDEN_LEN) };
      return { h: new Float32Array(HIDDEN_LEN), c: new Float32Array(HIDDEN_LEN) };
    },

    async step(tokenIdx, hidden) {
      // int64 token tensor shaped [1,1] as the exported graph expects.
      const token = new ort.Tensor("int64", BigInt64Array.from([BigInt(tokenIdx)]), [1, 1]);
      const feeds = {
        token,
        h_in: new ort.Tensor("float32", Float32Array.from(hidden.h), [N_LAYERS, 1, HIDDEN]),
      };
      if (!rnn) {
        feeds.c_in = new ort.Tensor("float32", Float32Array.from(hidden.c), [N_LAYERS, 1, HIDDEN]);
      }

      const results = await session.run(feeds);
      // Copy out of ORT-owned buffers into plain Float32Arrays we control.
      const logits = Float32Array.from(results.logits.data);
      const hOut = Float32Array.from(results.h_out.data);
      if (rnn) {
        return { logits, hidden: { h: hOut } };
      }
      const cOut = Float32Array.from(results.c_out.data);
      return { logits, hidden: { h: hOut, c: cOut } };
    },
  };

  return backend;
}

module.exports = { createOnnxBackend };
