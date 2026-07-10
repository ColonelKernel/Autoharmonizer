"use strict";

/**
 * local_engine_timeout.test.js — the pure-JS fallback must engage when the
 * native ONNX runtime WEDGES, not only when it throws.
 *
 * no_onnx.js already covers the throwing case: onnxruntime-node fails to
 * resolve, loadBackends' catch fires, the device runs the JS forward pass. But
 * the failure that actually strands a user on an unsupported CPU is the addon
 * that loads and then never returns from InferenceSession.create. That never
 * rejects, so before the timeout was added it never reached the catch: init()
 * stayed pending, the panel sat amber on "loading models", and the fallback
 * this device is built around was unreachable on precisely the machines it
 * exists for.
 *
 * So: hand the engine a runtime whose session creation returns a promise that
 * never settles, and require it to come up on the JS backend anyway.
 *
 * Run:  node engine/local_engine_timeout.test.js
 */

const assert = require("assert");
const Module = require("module");

// Intercept before local_engine pulls the runtime in. neural_backend_onnx.js
// requires it lazily inside loadOrt(), so patching here is early enough.
let createCalls = 0;
const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "onnxruntime-node") {
    return {
      InferenceSession: {
        create() {
          createCalls += 1;
          return new Promise(() => {}); // wedged: never resolves, never rejects
        },
      },
      Tensor: function Tensor() {},
    };
  }
  return realLoad.call(this, request, ...rest);
};

const { createLocalEngine } = require("./local_engine.js");

let passed = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  passed++;
};
const eq = (a, b, msg) => {
  assert.deepStrictEqual(a, b, msg);
  passed++;
};

(async () => {
  const posts = [];
  const started = Date.now();
  const eng = createLocalEngine({ post: (m) => posts.push(m), onnxInitTimeoutMs: 40 });
  const boot = await eng.init();
  const elapsed = Date.now() - started;

  ok(createCalls > 0, "the wedged runtime was actually reached");
  ok(boot.ok, "init() settles instead of hanging forever");
  eq(eng.state(), "up", "the engine comes up");
  eq(eng.kind(), "js", "a wedged ONNX runtime degrades to the pure-JS forward pass");
  eq(eng.statusWords(), ["js", "fallback"], "the panel says js fallback, not loading models");

  // Guards the timeout itself: without it this test would hang, but a default
  // ten-second ceiling would also "pass" eventually. It must honour the option.
  ok(elapsed < 3000, `init returned promptly (${elapsed} ms), not on the 10 s default`);

  ok(
    posts.some((m) => /timed out/.test(m)),
    "the timeout is reported to Max.post, not swallowed",
  );
  ok(
    (boot.warnings || []).some((w) => /timed out/.test(w)),
    "and recorded as a warning the panel can surface",
  );

  // A fallback that cannot generate is not a fallback.
  eq(eng.setModel("rnn").ok, true, "the neural engines were built on the JS backend");
  const res = await eng.sample("C:maj");
  ok(typeof res.output === "string" && res.output.length > 0, `rnn answers through the fallback (${res.output})`);

  console.log("local_engine_timeout: " + passed + " tests passed");
})().catch((err) => {
  console.error("local_engine_timeout FAILED:", err.message);
  console.error(err.stack);
  process.exit(1);
});
