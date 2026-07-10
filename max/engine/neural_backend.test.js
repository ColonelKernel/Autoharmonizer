"use strict";

/**
 * neural_backend.test.js — parity of the JS (and, when available, ONNX) forward
 * passes against a torch-generated fixture.
 * Run with:  node neural_backend.test.js
 * Exits non-zero on any failure. No external test framework.
 *
 * The fixture (data/jazznet/parity_fixture.json) was produced by the real
 * PyTorch models. For every probe token we check single-step logits and the
 * full hidden state (h_out, and c_out for the LSTM); then we replay a 5-token
 * carry sequence with hidden threaded through, comparing logits at every step.
 * The carry test is what catches LSTM gate-order and layer-stacking bugs: those
 * produce plausible single-step output but diverge once state accumulates.
 */

const fs = require("fs");
const path = require("path");

const { createJsBackend } = require("./neural_backend_js.js");
const { createOnnxBackend } = require("./neural_backend_onnx.js");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const fixture = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "jazznet", "parity_fixture.json"), "utf8")
);

const TOL = 1e-4;

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

// Max absolute difference between a Float32Array/array and a plain array.
function maxAbsDiff(a, b) {
  if (a.length !== b.length) return Infinity;
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}

function argmax(a) {
  let bi = 0;
  let bv = a[0];
  for (let i = 1; i < a.length; i++) {
    if (a[i] > bv) {
      bv = a[i];
      bi = i;
    }
  }
  return bi;
}

function top10(a) {
  return Array.from(a.keys())
    .sort((i, j) => a[j] - a[i])
    .slice(0, 10);
}

async function checkBackendAgainstFixture(label, makeBackend) {
  for (const model of ["rnn", "lstm"]) {
    const be = makeBackend(model);
    await be.init();
    const probes = fixture[model];

    // --- single-step probes from zero hidden ---
    for (const tok of Object.keys(probes)) {
      const exp = probes[tok];
      const { logits, hidden } = await be.step(Number(tok), be.zeroHidden());
      check(
        `${label} ${model} tok=${tok} logits`,
        maxAbsDiff(logits, exp.logits) < TOL,
        maxAbsDiff(logits, exp.logits)
      );
      check(
        `${label} ${model} tok=${tok} h_out`,
        maxAbsDiff(hidden.h, exp.h_out) < TOL,
        maxAbsDiff(hidden.h, exp.h_out)
      );
      if (model === "lstm") {
        check(
          `${label} ${model} tok=${tok} c_out`,
          maxAbsDiff(hidden.c, exp.c_out) < TOL,
          maxAbsDiff(hidden.c, exp.c_out)
        );
      }
    }

    // --- multi-step carry: thread hidden through the whole sequence ---
    const carry = fixture.carry;
    let hidden = be.zeroHidden();
    for (let s = 0; s < carry.steps.length; s++) {
      const step = carry.steps[s];
      check(
        `${label} ${model} carry step ${s} token matches sequence`,
        step.token === carry.sequence[s],
        `${step.token} vs ${carry.sequence[s]}`
      );
      const res = await be.step(step.token, hidden);
      hidden = res.hidden;
      const expLogits = step[`${model}_logits`];
      check(
        `${label} ${model} carry step ${s} logits`,
        maxAbsDiff(res.logits, expLogits) < TOL,
        maxAbsDiff(res.logits, expLogits)
      );
    }
  }
}

async function checkOnnxMatchesJs() {
  for (const model of ["rnn", "lstm"]) {
    const js = createJsBackend({ model, dataDir: DATA_DIR });
    const on = createOnnxBackend({ model, dataDir: DATA_DIR });
    await js.init();
    await on.init();
    const probes = fixture[model];
    for (const tok of Object.keys(probes)) {
      const j = await js.step(Number(tok), js.zeroHidden());
      const o = await on.step(Number(tok), on.zeroHidden());
      check(
        `ONNX==JS ${model} tok=${tok} argmax`,
        argmax(j.logits) === argmax(o.logits),
        `${argmax(j.logits)} vs ${argmax(o.logits)}`
      );
      const jt = top10(j.logits);
      const ot = top10(o.logits);
      check(
        `ONNX==JS ${model} tok=${tok} top-10 ranking`,
        jt.every((v, i) => v === ot[i]),
        `${jt} vs ${ot}`
      );
    }
  }
}

async function main() {
  await checkBackendAgainstFixture("JS", (model) =>
    createJsBackend({ model, dataDir: DATA_DIR })
  );

  // ONNX is optional: only run its assertions if onnxruntime-node loads.
  let ortAvailable = true;
  try {
    const probe = createOnnxBackend({ model: "rnn", dataDir: DATA_DIR });
    await probe.init();
  } catch (err) {
    ortAvailable = false;
    console.log(`SKIP ONNX backend parity (onnxruntime-node unavailable: ${err.message})`);
  }

  if (ortAvailable) {
    await checkBackendAgainstFixture("ONNX", (model) =>
      createOnnxBackend({ model, dataDir: DATA_DIR })
    );
    await checkOnnxMatchesJs();
  }

  if (failed > 0) {
    console.error(`neural_backend: ${failed} FAILED, ${passed} passed`);
    for (const f of failures) console.error("  FAIL " + f);
    process.exit(1);
  }
  console.log(`neural_backend: ${passed} tests passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
