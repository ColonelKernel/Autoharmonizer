"use strict";

// Pure-JS forward pass for the JazzNet RNN/LSTM, used when onnxruntime-node is
// unavailable (it is an optionalDependency). Weights come from the exported
// weights_<model>.json: base64 little-endian float32 tensors keyed by the same
// PyTorch parameter names as the checkpoint. This must be bit-for-bit faithful
// to torch's nn.RNN / nn.LSTM math or the parity test fails, so every gate and
// layer-stacking detail below mirrors PyTorch exactly (see the note field in
// the weights file: "LSTM gate row order is i,f,g,o").

const fs = require("fs");
const path = require("path");

const EMBED_DIM = 48;
const HIDDEN = 128;
const N_LAYERS = 2;
const VOCAB = 118;

// Decode a base64 little-endian float32 blob into a Float32Array. We copy the
// bytes into a fresh ArrayBuffer rather than aliasing Buffer's pool because a
// Buffer's byteOffset is not guaranteed to be 4-byte aligned for a typed view.
function decodeFloat32(b64) {
  const buf = Buffer.from(b64, "base64");
  const out = new Float32Array(buf.length / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = buf.readFloatLE(i * 4);
  }
  return out;
}

// out[r] = sum_c W[r*inDim + c] * x[c]  (W is row-major [outDim, inDim]).
function matVec(W, x, outDim, inDim, out) {
  for (let r = 0; r < outDim; r++) {
    let acc = 0.0;
    const base = r * inDim;
    for (let c = 0; c < inDim; c++) acc += W[base + c] * x[c];
    out[r] = acc;
  }
  return out;
}

function tanh(v) {
  return Math.tanh(v);
}

function sigmoid(v) {
  return 1.0 / (1.0 + Math.exp(-v));
}

function createJsBackend({ model, dataDir }) {
  if (model !== "rnn" && model !== "lstm") {
    throw new Error(`createJsBackend: unknown model "${model}"`);
  }
  const rnn = model === "rnn";

  let W = null; // decoded tensors keyed by parameter name

  function tensor(name) {
    const t = W[name];
    if (!t) throw new Error(`weights missing tensor "${name}"`);
    return t;
  }

  const backend = {
    kind: "js",
    model,

    async init() {
      const p = path.join(dataDir, "jazznet", `weights_${model}.json`);
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      W = {};
      for (const [name, b64] of Object.entries(raw.tensors)) {
        W[name] = decodeFloat32(b64);
      }
    },

    zeroHidden() {
      // hidden layout mirrors torch [num_layers, batch=1, hidden] flattened:
      // layer 0 occupies [0,128), layer 1 [128,256).
      if (rnn) return { h: new Float32Array(N_LAYERS * HIDDEN) };
      return {
        h: new Float32Array(N_LAYERS * HIDDEN),
        c: new Float32Array(N_LAYERS * HIDDEN),
      };
    },

    async step(tokenIdx, hidden) {
      const emb = tensor("embedding.weight"); // [VOCAB, EMBED_DIM]
      // Embedding lookup: row tokenIdx is this token's input vector.
      let x = new Float32Array(EMBED_DIM);
      const eb = tokenIdx * EMBED_DIM;
      for (let i = 0; i < EMBED_DIM; i++) x[i] = emb[eb + i];

      const hOut = new Float32Array(N_LAYERS * HIDDEN);
      const cOut = rnn ? null : new Float32Array(N_LAYERS * HIDDEN);

      let inDim = EMBED_DIM;
      let topH = null;

      for (let l = 0; l < N_LAYERS; l++) {
        const suffix = `_l${l}`;
        const off = l * HIDDEN;
        const hPrev = hidden.h.subarray(off, off + HIDDEN);

        if (rnn) {
          const Wih = tensor(`rnn.weight_ih${suffix}`); // [HIDDEN, inDim]
          const Whh = tensor(`rnn.weight_hh${suffix}`); // [HIDDEN, HIDDEN]
          const bih = tensor(`rnn.bias_ih${suffix}`);
          const bhh = tensor(`rnn.bias_hh${suffix}`);
          const ih = matVec(Wih, x, HIDDEN, inDim, new Float32Array(HIDDEN));
          const hh = matVec(Whh, hPrev, HIDDEN, HIDDEN, new Float32Array(HIDDEN));
          const hl = new Float32Array(HIDDEN);
          for (let i = 0; i < HIDDEN; i++) {
            hl[i] = tanh(ih[i] + bih[i] + hh[i] + bhh[i]);
          }
          hOut.set(hl, off);
          x = hl; // next layer consumes this layer's hidden output
          inDim = HIDDEN;
          topH = hl;
        } else {
          const cPrev = hidden.c.subarray(off, off + HIDDEN);
          const Wih = tensor(`lstm.weight_ih${suffix}`); // [4*HIDDEN, inDim]
          const Whh = tensor(`lstm.weight_hh${suffix}`); // [4*HIDDEN, HIDDEN]
          const bih = tensor(`lstm.bias_ih${suffix}`);
          const bhh = tensor(`lstm.bias_hh${suffix}`);
          const gates = 4 * HIDDEN;
          const ih = matVec(Wih, x, gates, inDim, new Float32Array(gates));
          const hh = matVec(Whh, hPrev, gates, HIDDEN, new Float32Array(gates));
          const hl = new Float32Array(HIDDEN);
          const cl = new Float32Array(HIDDEN);
          // PyTorch gate row order is [input, forget, cell(g), output].
          for (let i = 0; i < HIDDEN; i++) {
            const zi = ih[i] + bih[i] + hh[i] + bhh[i];
            const zf = ih[HIDDEN + i] + bih[HIDDEN + i] + hh[HIDDEN + i] + bhh[HIDDEN + i];
            const zg = ih[2 * HIDDEN + i] + bih[2 * HIDDEN + i] + hh[2 * HIDDEN + i] + bhh[2 * HIDDEN + i];
            const zo = ih[3 * HIDDEN + i] + bih[3 * HIDDEN + i] + hh[3 * HIDDEN + i] + bhh[3 * HIDDEN + i];
            const gi = sigmoid(zi);
            const gf = sigmoid(zf);
            const gg = tanh(zg);
            const go = sigmoid(zo);
            const cNew = gf * cPrev[i] + gi * gg;
            cl[i] = cNew;
            hl[i] = go * tanh(cNew);
          }
          hOut.set(hl, off);
          cOut.set(cl, off);
          x = hl;
          inDim = HIDDEN;
          topH = hl;
        }
      }

      // logits = fc.weight @ h_top + fc.bias
      const fcW = tensor("fc.weight"); // [VOCAB, HIDDEN]
      const fcB = tensor("fc.bias");
      const logits = matVec(fcW, topH, VOCAB, HIDDEN, new Float32Array(VOCAB));
      for (let i = 0; i < VOCAB; i++) logits[i] += fcB[i];

      const outHidden = rnn ? { h: hOut } : { h: hOut, c: cOut };
      return { logits, hidden: outHidden };
    },
  };

  return backend;
}

module.exports = { createJsBackend };
