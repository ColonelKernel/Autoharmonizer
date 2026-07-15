/**
 * Headless capability-handshake test for the real protocol-v4 Max bridge.
 * No UDP socket or Python process is opened: max-api, node-osc and the backend
 * supervisor are replaced before markov_osc_v4.js is loaded.
 */
"use strict";

const assert = require("assert");
const path = require("path");
const Module = require("module");

const outlets = [];
const handlers = {};
const posts = [];
const sent = [];
let clientInstance = null;
let serverInstance = null;
let supervisorOptions = null;
let ensureCalls = 0;
let restartCalls = 0;

const fakeMax = {
  addHandler(name, fn) { handlers[name] = fn; },
  outlet(message) { outlets.push(Array.isArray(message) ? message : [message]); },
  post(message) { posts.push(String(message)); },
};

class FakeClient {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    clientInstance = this;
  }

  send(address, ...args) {
    sent.push([address, ...args]);
  }
}

class FakeServer {
  constructor(port, host, ready) {
    this.port = port;
    this.host = host;
    this.listeners = {};
    serverInstance = this;
    if (ready) ready();
  }

  on(name, fn) {
    this.listeners[name] = fn;
  }
}

const fakeSupervisor = {
  createSupervisor(options) {
    supervisorOptions = options;
    return {
      noteTraffic() {},
      ensure() { ensureCalls += 1; },
      restart() { restartCalls += 1; },
      stopManaged() {},
      announce() {},
      grace() {},
    };
  },
};

const realResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...rest) {
  if (request === "max-api") return "STUB_V4_MAX_API";
  if (request === "node-osc") return "STUB_V4_NODE_OSC";
  if (request === "./backend_supervisor.js") return "STUB_V4_SUPERVISOR";
  return realResolve.call(this, request, ...rest);
};
require.cache.STUB_V4_MAX_API = {
  id: "STUB_V4_MAX_API",
  filename: "STUB_V4_MAX_API",
  loaded: true,
  exports: fakeMax,
};
require.cache.STUB_V4_NODE_OSC = {
  id: "STUB_V4_NODE_OSC",
  filename: "STUB_V4_NODE_OSC",
  loaded: true,
  exports: { Client: FakeClient, Server: FakeServer },
};
require.cache.STUB_V4_SUPERVISOR = {
  id: "STUB_V4_SUPERVISOR",
  filename: "STUB_V4_SUPERVISOR",
  loaded: true,
  exports: fakeSupervisor,
};

require(path.join(__dirname, "markov_osc_v4.js"));

const messages = (selector) => outlets.filter((entry) => entry[0] === selector);
const sends = (address) => sent.filter((entry) => entry[0] === address);
const last = (items) => items.length ? items[items.length - 1] : null;
const receive = (address, ...args) => {
  assert.ok(serverInstance && serverInstance.listeners.message, "OSC message listener exists");
  serverInstance.listeners.message([address, ...args]);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  assert.deepStrictEqual(last(messages("bridgeready")), ["bridgeready", 1],
    "bridge announces readiness after registering handlers");
  assert.strictEqual(typeof handlers.complexity, "function", "complexity handler registered");
  assert.strictEqual(typeof handlers.init, "function", "init handler registered");

  handlers.init();
  assert.deepStrictEqual(
    [clientInstance.host, clientInstance.port, serverInstance.host, serverInstance.port],
    ["127.0.0.1", 9100, "127.0.0.1", 9101],
    "bridge uses the isolated v4 ports"
  );
  assert.strictEqual(supervisorOptions.pyPort, 9100, "supervisor probes v4 port");
  assert.strictEqual(supervisorOptions.env.MARKOV_PORT, "9100", "spawned backend listens on v4 port");
  assert.strictEqual(supervisorOptions.env.MARKOV_MAX_PORT, "9101", "spawned backend replies to v4 port");
  assert.strictEqual(ensureCalls, 1, "init asks supervisor to ensure backend");
  assert.deepStrictEqual(last(messages("protocolstat")), ["protocolstat", "v?"], "boot starts unknown");

  receive("/status/protocol", "v4");
  assert.deepStrictEqual(last(messages("protocolstat")), ["protocolstat", "v4"], "v4 status reaches patch");
  assert.deepStrictEqual(last(sends("/control/complexity")), ["/control/complexity", 0.5], "handshake applies compatibility default");

  handlers.ping();
  const beforeCached = sends("/control/complexity").length;
  handlers.complexity(0.73);
  assert.strictEqual(sends("/control/complexity").length, beforeCached, "v4-only control is cached during handshake");
  receive("/status/protocol", "v4");
  assert.deepStrictEqual(last(sends("/control/complexity")), ["/control/complexity", 0.73], "cached value flushes");

  handlers.complexity(2);
  handlers.complexity(-4);
  const complexitySends = sends("/control/complexity");
  assert.deepStrictEqual(complexitySends.slice(-2), [
    ["/control/complexity", 1],
    ["/control/complexity", 0],
  ], "live complexity values clamp to 0..1");

  // A manual re-handshake simulates adopting an already-running legacy service.
  handlers.ping();
  handlers.complexity(0.35);
  const beforeLegacy = sends("/control/complexity").length;
  receive("/status/pong", 1);
  await wait(300);
  assert.deepStrictEqual(last(messages("protocolstat")), ["protocolstat", "legacy"], "pong without version identifies legacy");
  assert.strictEqual(sends("/control/complexity").length, beforeLegacy, "legacy backend never receives unknown control");

  // Every ping may later upgrade the capability state; the cached value is kept.
  receive("/status/protocol", "v4");
  assert.deepStrictEqual(last(sends("/control/complexity")), ["/control/complexity", 0.35], "late v4 status upgrades and flushes");

  handlers.modelidx(3);
  assert.deepStrictEqual(last(sends("/control/model")), ["/control/model", "ngram"], "Model tab exposes ngram registry engine");
  const modelSendsBeforePhrase = sends("/control/model").length;
  handlers.modelidx(4);
  assert.strictEqual(sends("/control/model").length, modelSendsBeforePhrase, "phrase tab remains a local sequence engine");
  assert.deepStrictEqual(last(messages("modelname")), ["modelname", "phrase"], "fifth Model tab entry selects phrase");

  // V4 must make the planner's seventh/extension audible at the default and at
  // the low end of Voicing; reduction happens only after an explicit override.
  handlers.testparse("C:maj7");
  assert.strictEqual(last(messages("notes")).length - 1, 4, "default voices the emitted seventh");
  assert.deepStrictEqual(last(messages("voicecount")), ["voicecount", 4], "bridge reports actual voice count");
  handlers.voicing(0);
  handlers.testparse("D:min7");
  assert.strictEqual(last(messages("notes")).length - 1, 4, "Voicing 0 preserves the emitted seventh");
  handlers.triadsonly(1);
  handlers.voicing(1);
  handlers.testparse("C:maj7");
  assert.strictEqual(last(messages("notes")).length - 1, 3, "manual triads-only override survives Voicing changes");
  handlers.triadsonly(0);
  handlers.voicing(0);
  handlers.testparse("C:maj7");
  assert.strictEqual(last(messages("notes")).length - 1, 4, "manual override can restore full harmony");

  handlers.testparse("C:6/9");
  assert.strictEqual(last(messages("notes")).length - 1, 5, "6/9 quality reaches MIDI as a five-note chord");
  assert.deepStrictEqual(last(messages("voicecount")), ["voicecount", 5], "6/9 voice count is visible");

  // Register messages are deliberately bounded so parser clamping cannot fold
  // an entire upper-register chord onto MIDI note 127.
  handlers.register(999);
  handlers.testparse("B:maj13");
  assert.strictEqual(last(messages("notes")).length - 1, 6, "high register retains all maj13 voices");
  assert.ok(last(messages("notes")).slice(1).every((note, i, a) => i === 0 || note > a[i - 1]),
    "high-register notes stay distinct");
  assert.ok(posts.some((line) => line.includes("clamped from 999")), "register clamp is diagnosed");

  handlers.register(-999);
  handlers.testparse("C:maj");
  assert.strictEqual(last(messages("notes")).length - 1, 3, "low register retains a complete triad");
  assert.ok(posts.some((line) => line.includes("clamped from -999")), "low register clamp is diagnosed");

  handlers.testparse("N.C.");
  assert.deepStrictEqual(last(messages("voicecount")), ["voicecount", 0], "silence reports zero voices");
  handlers.testparse("C:unsupported");
  assert.deepStrictEqual(last(messages("voicecount")), ["voicecount", 0], "parser failure reports zero voices");

  // Phrase-mode rhythmic retriggers must keep sending the entire chord. This
  // reproduces the dense/offbeat case that previously exposed stale makenote
  // note-offs in the Max patch and left only one shared tone sounding.
  assert.strictEqual(typeof handlers.feelidx, "function", "Feel-tab handler registered");
  assert.strictEqual(typeof handlers.feel, "function", "named Feel handler registered");
  handlers.rhythm(1); // densest saved template
  handlers.feelidx(2); // Tresillo on the eighth-note grid
  assert.deepStrictEqual(last(messages("feelname")), ["feelname", "tresillo"], "Feel index selects Tresillo");
  handlers.phrasemode("loop");
  handlers.play(1);
  assert.strictEqual(last(sends("/phrase/request"))[0], "/phrase/request", "Phrase play requests a plan");
  receive("/phrase/output", "C:maj7", 4);
  const rhythmNotesBefore = messages("notes").length;
  const rhythmCountsBefore = messages("voicecount").length;
  for (let tick = 0; tick < 8; tick++) handlers.beat();
  const rhythmicNotes = messages("notes").slice(rhythmNotesBefore);
  const rhythmicCounts = messages("voicecount").slice(rhythmCountsBefore);
  assert.strictEqual(rhythmicNotes.length, 3, "Tresillo produces three attacks in one bar");
  assert.ok(rhythmicNotes.every((message) => message.length - 1 === 4),
    "every syncopated attack sends all four maj7 notes");
  assert.ok(rhythmicCounts.every((message) => message[1] === 4),
    "every syncopated attack reports four voices");
  handlers.play(0);

  handlers.feel("clave3-2");
  assert.deepStrictEqual(last(messages("feelname")), ["feelname", "clave3-2"], "named Feel selects clave 3-2");
  handlers.triplet(1);
  assert.deepStrictEqual(last(messages("feelname")), ["feelname", "triplet"], "legacy Triplet maps to new Feel");
  handlers.triplet(0);
  assert.deepStrictEqual(last(messages("feelname")), ["feelname", "straight"], "legacy Triplet off restores straight");

  handlers.backendrestart();
  assert.strictEqual(restartCalls, 1, "Relink delegates to supervisor");
  assert.deepStrictEqual(last(messages("protocolstat")), ["protocolstat", "v?"], "restart resets handshake display");

  assert.ok(posts.some((line) => line.includes("markov_osc_v4.js loaded")), "unique bridge identifies itself");
  console.log("markov_osc_v4 protocol/model/voicing tests: PASS");
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(() => {
  Module._resolveFilename = realResolve;
});
