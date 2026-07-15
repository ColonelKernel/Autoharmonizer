/**
 * no_onnx.js — a `node --require` preload that makes `onnxruntime-node`
 * unresolvable, exactly as an offline install or an unsupported architecture
 * would.
 *
 * The device is supposed to notice and fall back to the pure-JS forward pass.
 * That claim is worthless unless the fallback is actually exercised, so:
 *
 *     node --require ./no_onnx.js onnx_device_e2e.js
 *
 * should print "running the pure-JS backend" and still pass every check.
 */
"use strict";
const Module = require("module");

const realResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "onnxruntime-node") {
    throw new Error("Cannot find module 'onnxruntime-node'");
  }
  return realResolve.call(this, request, ...rest);
};
