/**
 * Chord-generation OSC bridge for the isolated protocol-v4 Max device.
 * Uses node-osc instead of CNMAT externals.
 *
 * The v1-v3 verbs remain intact. Protocol v4 adds:
 *   Max -> Python : /control/complexity <float 0..1>
 *   Python -> Max : /status/protocol "v4"
 *
 * The complexity value is cached until the backend identifies itself as v4.
 * This matters when a stale v3 process is already running: v3 reports unknown
 * addresses as errors, so optimistic transmission would not degrade cleanly.
 *
 * Node -> Max message protocol (extended, backward compatible):
 *   status <word>           (unchanged)
 *   output <symbol>         (unchanged — raw Markov reply for the rest of the system)
 *   error  <code> [detail]  (unchanged shape; parser errors add a detail atom)
 *   chord  <normalized>     (NEW — normalized Markov chord symbol for display)
 *   notes  <midi ...>       (NEW — playable MIDI note list)
 *   stop                    (NEW — silence currently sounding notes, e.g. N.C.)
 *   playoff                 (NEW — auto-player finished; stop the transport)
 *
 * Auto-player (sequencer front-end): `play 1|0`, `beat` (quarter-note clock),
 * `template <1..7>`, `length <bars>`, `seed <chord>` walk the Markov chain over
 * a harmonic-rhythm template, feeding each chord back as the next input.
 *
 * Protocol v4 sonifies the full chord selected by the theory planner (including
 * sevenths/extensions). `triadsonly 1` remains an explicit reduction override.
 *
 * MIDI input: a `notein <pitch>` message (from Ableton via midiin/midiparse)
 * seeds the chain — the played note becomes a major-triad root symbol and is
 * submitted just like a typed chord, so the sonified chord is the Markov reply.
 *
 * The returned chord that is sonified is ALWAYS the chord returned by the
 * Markov/Python system — never merely the chord the user typed. A separate,
 * clearly-labelled `testparse` handler exists for parser debugging only.
 */

const Max = require("max-api");
const parser = require("./chord_parser.js");
const perf = require("./performance_map_v4.js");
const voicingGuard = require("./voicing_guard_v4.js");

const PYTHON_HOST = "127.0.0.1";
const PYTHON_PORT = 9100;
const MAX_PORT = 9101;
const REPLY_TIMEOUT_MS = 500;
const EXPECTED_PROTOCOL = "v4";
const PROTOCOL_FALLBACK_MS = 250;
const DEFAULT_COMPLEXITY = 0.5; // backend compatibility tier

let client = null;
let server = null;
let replyTimer = null;
let manualPing = false; // echo 'ready' only for user-initiated pings
let protocolVersion = null;
let protocolFallbackTimer = null;
let complexityValue = DEFAULT_COMPLEXITY;
let complexityPending = false;

function protocolMajor(value) {
  const match = /^v(\d+)$/.exec(String(value == null ? "" : value).trim().toLowerCase());
  return match ? Number(match[1]) : 0;
}

function supportsComplexity() {
  return protocolMajor(protocolVersion) >= protocolMajor(EXPECTED_PROTOCOL);
}

function clearProtocolFallback() {
  if (protocolFallbackTimer) {
    clearTimeout(protocolFallbackTimer);
    protocolFallbackTimer = null;
  }
}

/** Start a fresh capability handshake without sending any v4-only verb. */
function beginProtocolHandshake() {
  clearProtocolFallback();
  protocolVersion = null;
  complexityPending = true; // a restarted backend needs the saved dial value
  Max.outlet(["protocolstat", "v?"]);
}

/** A pong without a protocol status is a live pre-v4 backend. Give the v4
 * status packet a short grace window because UDP callbacks can be interleaved. */
function scheduleLegacyFallback() {
  if (protocolVersion || protocolFallbackTimer) return;
  protocolFallbackTimer = setTimeout(() => {
    protocolFallbackTimer = null;
    if (protocolVersion) return;
    protocolVersion = "legacy";
    Max.outlet(["protocolstat", "legacy"]);
    Max.post("protocol: legacy backend; Complexity is unavailable");
  }, PROTOCOL_FALLBACK_MS);
  if (protocolFallbackTimer.unref) protocolFallbackTimer.unref();
}

function flushComplexity() {
  if (!complexityPending || !supportsComplexity() || !client) return false;
  try {
    client.send("/control/complexity", complexityValue);
    complexityPending = false;
    return true;
  } catch (err) {
    Max.post(`complexity send failed: ${err.message || err}`);
    return false;
  }
}

// --- backend supervisor: the device launches/watches Python itself --------
// A bridge-level fault (node-osc missing, second device copy on port 9101)
// locks the backend readout to its own message: the supervisor may have a
// healthy Python up, but no chords can flow until the USER fixes the bridge,
// so that is the state worth showing.
let panelOverride = null;
function setPanelOverride(light, words) {
  panelOverride = true;
  Max.outlet(["backendstate", light]);
  Max.outlet(["backendtext", ...words]);
}

// Guarded require: a supervisor fault must degrade to the old manual
// workflow (terminal launch), never take down the whole bridge.
let supervisor = null;
try {
  supervisor = require("./backend_supervisor.js").createSupervisor({
    post: (m) => Max.post(m),
    emitState: (light, words) => {
      if (panelOverride) return; // a bridge fault owns the readout
      Max.outlet(["backendstate", light]);
      Max.outlet(["backendtext", ...(words || [])]);
    },
    // The supervisor cannot own a socket (Python replies to OUR port 9101),
    // so it pings through this bridge's client and hears back via emit().
    sendPing: () => {
      if (!client) return false;
      try {
        client.send("/control/ping");
        return true;
      } catch (err) {
        return false;
      }
    },
    pyPort: PYTHON_PORT,
    // Pin the supervised v4 process to its isolated ports even if a caller has
    // legacy MARKOV_PORT variables in the environment.
    env: Object.assign({}, process.env, {
      MARKOV_PORT: String(PYTHON_PORT),
      MARKOV_MAX_PORT: String(MAX_PORT),
    }),
  });
} catch (err) {
  Max.post(`backend supervisor unavailable (manual launch still works): ${err.message || err}`);
}

// --- chord voicing / sonification state ---------------------------------
const voicingOptions = {
  registerCenter: 60, // approx C4
  low: 48, // C3
  high: 72, // C5
  voiceLeadingEnabled: true,
  // Protocol v4 preserves the chord intervals chosen by the theory planner.
  // Reduction to a plain triad is opt-in via the `triadsonly 1` message.
  triadsOnly: false,
  // Performable colour knobs (0..1), driven by live.dials in the sequencer:
  //   colorMajor -> chance of forcing MAJOR, colorMinor -> chance of MINOR,
  //   color7th   -> chance of adding a flat-7th. All 0 => natural triad.
  colorMajor: 0,
  colorMinor: 0,
  color7th: 0,
  // Voicing dial (functional ladder) + Voice-Distance dial state. V4 defaults
  // preserve the backend symbol exactly; higher bands may intentionally add
  // local tensions. See performance_map_v4.js and chord_parser.js.
  extensions: [], // upper tensions appended (9=14, 13=21) at high voicing level
  drop2: false, // open (drop-2) voicing transform
  spreadCap: 24, // allowed voicing spread before penalty
  voiceDistanceSteps: [], // diatonic added-harmony offsets (Harmony Singer)
  currentKey: "C:maj", // scale context for the added-harmony voices
};
let previousVoicing = null; // last MIDI voicing, for nearest-voicing mode
// null = v4 automatic policy (preserve backend chord); boolean = the user sent
// an explicit `triadsonly` override. Moving Voicing must not erase that choice.
let triadsOnlyManualOverride = null;
let voicingDialValue = 0;

// --- auto-player state (walks the Markov chain over a harmonic template) --
// Harmonic-rhythm templates: slot ONSETS in quarter-note beats within a
// 1- or 2-bar (4/4) cycle. IDs remain stable for old Live automation; the
// shared performance map applies them on an eighth-note or triplet grid.
const TEMPLATES = {
  1: { name: "whole_bar", spanBars: 1, onsets: [0] },
  2: { name: "half_half", spanBars: 1, onsets: [0, 2] },
  3: { name: "four_quarters", spanBars: 1, onsets: [0, 1, 2, 3] },
  4: { name: "half_qtr_qtr", spanBars: 1, onsets: [0, 2, 3] },
  5: { name: "qtr_qtr_half", spanBars: 1, onsets: [0, 1, 2] },
  6: { name: "qtr_half_qtr", spanBars: 1, onsets: [0, 1, 3] },
  7: { name: "static_2bar", spanBars: 2, onsets: [0] },
};
// Templates ordered SPARSE -> DENSE for the performable "rhythm" dial: a
// live.dial 0..1 sweeps harmonic-rhythm density from one chord every two bars
// up to a chord on every beat.
const RHYTHM_ORDER = [7, 1, 2, 4, 6, 5, 3];
const player = {
  active: false,
  templateId: 2, // half_half (matches the rhythm dial's default)
  pendingTemplateId: null, // queued rhythm change, applied on the next bar
  feel: "straight", // straight | push | tresillo | clave3-2 | clave2-3 | upbeats | triplet
  lengthBars: 4, // default kept at 4 for the base sequencer; the performer's
  //                Bars tab initializes this to 2/4/8/16 via loadbang.
  beat: -1, // first metro tick advances to 0
  pending: null, // next Markov chord to sonify on the beat
  lastSounded: null, // last chord actually sonified in capture (race fallback + re-seed)
  seed: "C:maj", // chord the chain (re)starts from = latest chord handled
  keyRoot: 0, // 0..11 tonic pitch class (MPK key-set pads)
  keyMode: "maj", // "maj" | "min"
  // --- Phrase system (Spice performance device) ---------------------------
  // mode defaults to "oneshot" so the SHARED bridge keeps the base sequencer
  // behaving exactly as before (play N bars, stop). The Spice patch switches
  // it to "loop" via loadbang.
  mode: "oneshot", // "loop" | "regen" | "oneshot"
  phrase: new Map(), // beat -> chord, captured for LOOP replay
  capturing: true, // capturing this pass vs. replaying a captured phrase
  hold: false, // vamp: freeze on the current chord, don't advance the walk
  dirty: false, // a length/rhythm/mode change -> re-capture on the next cycle

  // --- Phrase engine (sequence is the unit of analysis) -------------------
  // "walk" = the legacy chord-at-a-time chain over a rhythm TEMPLATE (used by
  // the three other devices). "phrase" = ask Python for a whole N-bar phrase
  // whose harmonic rhythm is generated, then schedule it locally. In phrase
  // mode there is no per-onset OSC round trip, so no beat/reply race.
  engine: "walk",
  phraseReady: false, // the clock is GATED until the phrase lands: never play silence
  schedule: new Map(), // tick -> chord
  totalTicks: 0,
  nextPlan: null, // pre-fetched phrase, so REGEN never stalls at the boundary
  plan: null, // the installed phrase, in beats (regrid-able if Triplet toggles)
  cadence: 1.0, // 0..1 pull toward home: tonal gravity + probability of a V->I ending
};

function clearReplyTimeout() {
  if (replyTimer) {
    clearTimeout(replyTimer);
    replyTimer = null;
  }
}

function startReplyTimeout() {
  clearReplyTimeout();
  replyTimer = setTimeout(() => {
    Max.outlet(["error", "reply timeout"]);
    // Phrase mode gates the clock on arrival, so a lost reply would mean
    // silence forever. Fall back to holding the seed for the whole phrase.
    if (player.engine === "phrase" && player.active && !player.phraseReady) {
      Max.post("phrase: no reply — holding the seed chord");
      installPhrase([{ chord: player.seed, durBeats: player.lengthBars * 4 }]);
    }
  }, REPLY_TIMEOUT_MS);
}

/** Normalize the parser result and retry an unexpectedly thin chord in a safe
 * root-position register. This is a last line of defence: normal operation is
 * already kept in range by the clamped Register handler below. */
function repairThinVoicing(result) {
  result.notes = voicingGuard.normalizeMidiNotes(result.notes);
  if (!voicingGuard.needsRepair(result.notes, result.parsed)) return result;

  const window = voicingGuard.registerWindow(
    voicingOptions.registerCenter,
    voicingGuard.DEFAULT_REGISTER_CENTER
  );
  const intervals = Array.isArray(result.playedIntervals) && result.playedIntervals.length
    ? result.playedIntervals
    : result.parsed.intervals;
  const repairParsed = Object.assign({}, result.parsed, { intervals: intervals.slice() });
  const repairOptions = Object.assign({}, voicingOptions, window, {
    triadsOnly: false,
    voiceLeadingEnabled: false,
    drop2: false,
    voiceDistanceSteps: [],
  });
  const repaired = voicingGuard.normalizeMidiNotes(
    parser.voiceChord(repairParsed, repairOptions)
  );
  Max.post(
    `voicing guard: repaired ${result.normalizedSymbol} from ` +
      `${result.notes.length} to ${repaired.length} voices`
  );
  result.notes = repaired;
  return result;
}

/**
 * Parse a returned chord symbol, voice it, and emit the display + MIDI
 * branch messages. Used by BOTH the real Markov reply path and the manual
 * TEST PARSER path. Never throws.
 */
function sonifyChord(symbol, source) {
  let result;
  try {
    result = parser.chordToNotes(symbol, voicingOptions, previousVoicing);
  } catch (err) {
    Max.post(`chord parse crash: ${err.stack || err}`);
    Max.outlet(["voicecount", 0]);
    Max.outlet(["error", "parser_exception", String(symbol)]);
    return;
  }

  // Show the normalized symbol regardless of outcome (helps debugging).
  Max.outlet(["chord", result.normalizedSymbol]);

  if (result.error) {
    // Do NOT emit MIDI, do NOT replay the previous chord.
    Max.outlet(["voicecount", 0]);
    Max.outlet(["error", result.error.code, result.error.detail]);
    return;
  }

  if (result.isNoChord) {
    // N.C. — stop currently sounding notes and generate nothing new.
    previousVoicing = null;
    Max.outlet(["voicecount", 0]);
    Max.outlet(["stop"]);
    Max.post(`${source}: no-chord -> silence`);
    return;
  }

  result = repairThinVoicing(result);
  const voiceCount = result.notes.length;
  Max.outlet(["voicecount", voiceCount]);
  if (voicingGuard.needsRepair(result.notes, result.parsed)) {
    // Never degrade a chord request to a misleading one-note event.
    previousVoicing = null;
    Max.outlet(["stop"]);
    Max.outlet(["error", "thin_voicing", result.normalizedSymbol]);
    return;
  }

  previousVoicing = result.notes;
  Max.outlet(["notes", ...result.notes]);
  Max.post(
    `${source}: ${result.normalizedSymbol} -> ${result.triadQuality} harmony ` +
      `notes ${result.notes.join(" ")}`
  );
}

function emit(address, args) {
  // Any message from Python proves the backend is alive.
  if (supervisor) supervisor.noteTraffic();

  if (address === "/phrase/output") {
    clearReplyTimeout();
    // Flat alternating list: chord, durBeats, chord, durBeats, ...
    const plan = [];
    for (let i = 0; i + 1 < args.length; i += 2) {
      const chord = String(args[i] ?? "").trim();
      const rawDuration = Number(args[i + 1]);
      const durBeats = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 1;
      if (chord) plan.push({ chord, durBeats });
    }
    if (!plan.length) {
      Max.outlet(["error", "empty phrase"]);
      return;
    }
    player.seed = plan[plan.length - 1].chord; // next phrase continues from here
    if (player.phraseReady) {
      player.nextPlan = plan; // a REGEN pre-fetch: don't disturb the playing phrase
      Max.post(`phrase: pre-fetched ${plan.length} chords for the next cycle`);
    } else {
      installPhrase(plan);
    }
    Max.outlet(["chord", plan[0].chord]);
    return;
  }

  if (address === "/chord/output") {
    clearReplyTimeout();
    const symbol = String(args[0] ?? "");
    // 1) backward-compatible raw symbol out for the rest of the system
    Max.outlet(["output", symbol]);
    // 2) remember the latest chord so the auto-player can (re)seed from it
    player.seed = symbol;
    if (player.active) {
      // In auto-play mode the reply is the NEXT slot's chord; the player
      // sonifies on the beat, so just stash it — do not sound it now.
      player.pending = symbol;
    } else {
      // manual / MIDI mode: interpret -> voice -> sonify immediately
      sonifyChord(symbol, "markov");
    }
    return;
  }

  if (address === "/status/ready") {
    Max.outlet(["status", "ready"]);
    return;
  }

  if (address === "/status/pong") {
    // Heartbeat pongs are supervisor fuel (noteTraffic above), not UI news —
    // don't stomp the status readout every 3s. A user-clicked ping still echoes.
    if (manualPing) {
      manualPing = false;
      Max.outlet(["status", "ready"]);
    }
    scheduleLegacyFallback();
    return;
  }

  if (address === "/status/protocol") {
    clearProtocolFallback();
    const reported = String(args[0] == null ? "" : args[0]).trim().toLowerCase();
    protocolVersion = reported || "unknown";
    const label = supportsComplexity() ? protocolVersion : "legacy";
    Max.outlet(["protocolstat", label]);
    if (supportsComplexity()) {
      flushComplexity();
    } else {
      Max.post(`protocol: backend reported ${protocolVersion}; Complexity is unavailable`);
    }
    return;
  }

  if (address === "/status/model") {
    // Python's CONFIRMED active model (markov/rnn/lstm/ngram).
    Max.outlet(["modelstat", String(args[0] ?? "markov")]);
    return;
  }

  if (address === "/status/session") {
    // Neural session state: <mode> <step>. Lets the panel show how deep the
    // rnn/lstm hidden-state "memory" is during a phrase.
    Max.outlet(["sessionstat", String(args[0] ?? "stateless"), Number(args[1] ?? 0)]);
    return;
  }

  if (address === "/error") {
    Max.outlet(["error", String(args[0] ?? "unknown error")]);
    return;
  }

  if (address.startsWith("/debug/")) {
    Max.post(`debug ${address} ${args.join(" ")}`);
  }
}

function parseOscMessage(msg) {
  if (Array.isArray(msg)) {
    return { address: msg[0], args: msg.slice(1) };
  }
  if (msg && typeof msg === "object" && msg.address) {
    return { address: msg.address, args: (msg.args || []).map((a) => a.value ?? a) };
  }
  return { address: String(msg), args: [] };
}

function sendOsc(address, ...args) {
  if (!client) {
    Max.outlet(["error", "OSC client not ready — run npm install"]);
    return;
  }
  client.send(address, ...args);
}

function initOsc() {
  if (client && server) {
    return;
  }

  const { Client, Server } = require("node-osc");

  client = new Client(PYTHON_HOST, PYTHON_PORT);
  server = new Server(MAX_PORT, "127.0.0.1", () => {
    Max.post(`listening on ${MAX_PORT}, sending to ${PYTHON_HOST}:${PYTHON_PORT}`);
    Max.outlet(["status", "waiting"]);
  });

  server.on("message", (msg) => {
    const parsed = parseOscMessage(msg);
    emit(parsed.address, parsed.args);
  });

  server.on("error", (err) => {
    Max.post(`OSC server error: ${err}`);
    Max.outlet(["error", String(err.message || err)]);
    if (err && err.code === "EADDRINUSE") {
      // A second v4 copy already owns Max's reply port: only one instance per
      // Set can talk to the backend on the fixed 9100/9101 pair.
      // Sticky override — supervisor updates must not displace this diagnosis
      // (fixing it requires removing a device copy and reloading anyway).
      setPanelOverride("down", ["remove", "2nd", "copy"]);
    }
  });
}

Max.addHandler("init", () => {
  try {
    beginProtocolHandshake();
    manualPing = true; // first pong may echo 'ready' like before
    initOsc();
    sendOsc("/control/ping");
    emitCapstate(); // panel shows "idle" until PLAY
  } catch (err) {
    Max.post(err.stack || err);
    Max.outlet([
      "error",
      "node-osc missing — click npm install, then ping",
    ]);
    // Without node-osc NO chords can flow even if Python is healthy — the
    // readout must name the real blocker, not show a green light.
    setPanelOverride("down", ["run", "npm", "install"]);
  }
  // Adopt a running backend or launch one — works even if node-osc failed
  // above (the supervisor's readiness signal is the child's stderr, not OSC).
  if (supervisor) supervisor.ensure();
});

/* --- backend supervisor panel controls ---------------------------------- */
Max.addHandler("backendrestart", () => {
  beginProtocolHandshake();
  if (supervisor) supervisor.restart();
  else Max.outlet(["backendtext", "no", "supervisor"]);
});
Max.addHandler("backendstop", () => {
  if (supervisor) supervisor.stopManaged();
});
Max.addHandler("backendstart", () => {
  if (supervisor) supervisor.ensure();
});

Max.addHandler("ping", () => {
  try {
    beginProtocolHandshake();
    manualPing = true;
    initOsc();
    sendOsc("/control/ping");
    if (panelOverride) {
      // npm install has evidently succeeded (node-osc loaded) — give the
      // readout back to the supervisor and re-show its real state.
      panelOverride = null;
      if (supervisor) supervisor.announce();
    }
  } catch (err) {
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
});

/**
 * Collapse the atoms a `send` message carries into one chord string.
 * A Max `textedit` emits its contents as `text <word> <word> ...`; the Send
 * button and the Enter key both route through here, so we accept:
 *   - a leading "text" selector (strip it),
 *   - multiple atoms (join with a space),
 *   - a single symbol.
 * Surrounding quotes are stripped again by the parser as a second defence.
 */
function chordFromArgs(args) {
  const parts = args.map((a) => String(a ?? "").trim()).filter(Boolean);
  if (parts.length > 1 && parts[0] === "text") {
    return parts.slice(1).join(" ").trim();
  }
  return parts.join(" ").trim();
}

/**
 * Send a chord symbol to the Python Markov service. Shared by the `send`
 * button/Enter path and the MIDI-note-in path so both seed the chain the
 * same way and the sonified chord is always the Markov reply.
 */
function submitChord(value) {
  const v = String(value ?? "").trim();
  if (!v) {
    Max.outlet(["error", "empty chord input"]);
    return;
  }
  try {
    initOsc();
    startReplyTimeout();
    sendOsc("/chord/input", v);
  } catch (err) {
    clearReplyTimeout();
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
}

Max.addHandler("send", (...args) => {
  submitChord(chordFromArgs(args));
});

Max.addHandler("reload", () => {
  try {
    initOsc();
    sendOsc("/control/reload");
  } catch (err) {
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
});

/* -----------------------------------------------------------------------
 * SPICE controls — forwarded to Python, which blends the per-corpus Markov
 * chains and tempers the result. These act UPSTREAM on which chord the chain
 * PICKS, and are distinct from the `colormajor/colorminor/color7th` VOICING
 * knobs further below (those recolour the sonified triad locally, after the
 * chord has already been chosen).
 *
 *   color     0..1  morph corpus flavour: folk -> pop -> classical -> jazz
 *   adventure 0..1  temperature: safe/common -> surprising/rare
 *   spice     0..1  macro: drives color AND adventure together
 *   complexity 0..1 theory vocabulary: diatonic/simple -> chromatic/advanced
 *   gravity   0..1  harmonic pull toward the tonic/dominant (cadence resolve)
 *   key       sym   current song key ("C:maj"/"A:min") for transposition
 * --------------------------------------------------------------------- */
function forwardDial(address, v) {
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  try {
    initOsc();
    sendOsc(address, x);
  } catch (err) {
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
}
Max.addHandler("color", (v) => forwardDial("/control/color", v));
Max.addHandler("adventure", (v) => forwardDial("/control/adventure", v));
Max.addHandler("spice", (v) => forwardDial("/control/spice", v));
Max.addHandler("gravity", (v) => forwardDial("/control/gravity", v));
Max.addHandler("complexity", (v) => {
  complexityValue = clamp01(v);
  complexityPending = true;
  // Both whole-phrase and captured walk loops must be rebuilt under the new
  // harmonic policy; the current cycle is allowed to finish cleanly.
  invalidatePhrase();
  flushComplexity(); // gated until /status/protocol confirms v4
});
Max.addHandler("key", (...atoms) => {
  const k = chordFromArgs(atoms); // reuse: strips a leading "text"/quotes
  if (!k) {
    Max.outlet(["error", "empty key"]);
    return;
  }
  voicingOptions.currentKey = k; // scale context for the added-harmony voice
  try {
    initOsc();
    sendOsc("/control/key", k);
  } catch (err) {
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
});

// --- NEW handlers -------------------------------------------------------

/**
 * TEST PARSER — parse/voice/sonify a chord DIRECTLY, bypassing Markov.
 * For debugging the parser + MIDI branch without Python running.
 * This does NOT touch the OSC / Markov path.
 */
Max.addHandler("testparse", (...atoms) => {
  const symbol = chordFromArgs(atoms);
  if (!symbol) {
    Max.outlet(["error", "empty test chord"]);
    return;
  }
  sonifyChord(symbol, "test");
});

/**
 * MIDI note-in from Ableton seeds the Markov chain. A played note's pitch
 * class becomes a major-triad root symbol (e.g. 60 -> "C:maj", 66 -> "F#:maj")
 * in the dataset's colon notation and is submitted exactly like a typed chord;
 * the chord the Markov system returns is what gets voiced. Note-offs are
 * filtered upstream by `stripnote`, but we double-guard on velocity 0 here.
 */
const ROOT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

Max.addHandler("notein", (note, velocity) => {
  const n = Number(note);
  if (!Number.isFinite(n)) return;
  if (velocity !== undefined && Number(velocity) === 0) return; // ignore note-offs
  const pc = ((Math.round(n) % 12) + 12) % 12;
  submitChord(ROOT_NAMES[pc] + ":maj");
});

/* -----------------------------------------------------------------------
 * Auto-player: play along the Markov chain for a set number of bars, using
 * a harmonic-rhythm template to decide when chords change. At each slot we
 * sonify the chord we hold and feed it back to Python; the reply becomes the
 * next slot's chord (output -> input). Dormant until `play 1`.
 * --------------------------------------------------------------------- */

// Tick grid. Straight and syncopated feels use eighth notes (8/bar); Triplet
// uses quarter-note triplets (6/bar). Max switches its transport metro in
// parallel, while performance_map_v4 owns the actual onset patterns.
let ticksPerBar = 8;

/** Does a full-chord attack land on this absolute transport tick? */
function isOnsetAt(b) {
  return perf.isFeelOnset(player.feel, b, ticksPerBar, player.templateId);
}

/** Reset Python's neural (rnn/lstm) hidden-state session so the next walk starts
 *  fresh. Safe no-op for the stateless Markov engine. Uses the protocol-v3
 *  /control/session support the Python backend already implements. */
function resetSession() {
  try {
    initOsc();
    sendOsc("/control/session", "reset");
  } catch (err) {
    Max.post(err.stack || err);
  }
}

/** Report capture/loop state to the panel: capturing | looping | idle. */
function emitCapstate() {
  Max.outlet(["capstate", player.active ? (player.capturing ? "capturing" : "looping") : "idle"]);
}

/* -----------------------------------------------------------------------
 * PHRASE ENGINE — the sequence, not the chord, is the unit.
 *
 * Python answers "give me an N-bar phrase in key K" with (chord, duration)
 * pairs whose harmonic rhythm it GENERATED (learned from corpus run-lengths),
 * ending on a cadence. We turn that into a tick -> chord schedule and play it.
 * Durations arrive in BEATS; a bar is 4 beats but `ticksPerBar` ticks. The
 * scheduler retains fractional durations and copies full chords to rhythmic
 * retriggers, so syncopation cannot accidentally become single-note output.
 * --------------------------------------------------------------------- */

function currentKey() {
  return `${ROOT_NAMES[((player.keyRoot % 12) + 12) % 12]}:${player.keyMode}`;
}

/** A parameter that shapes the phrase changed: re-generate next cycle, and drop
 *  any pre-fetched phrase built from the old settings. */
function invalidatePhrase() {
  player.dirty = true;
  player.nextPlan = null;
}

/** Ask Python for a whole phrase. The clock stays gated until it lands. */
function requestPhrase() {
  try {
    initOsc();
    startReplyTimeout();
    sendOsc("/phrase/request", currentKey(), player.lengthBars, player.cadence, player.seed);
  } catch (err) {
    clearReplyTimeout();
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
}

/** Turn [{chord, durBeats}, ...] into a tick -> chord schedule and arm the clock. */
function installPhrase(plan) {
  if (!plan || !plan.length) return;
  const { schedule, totalTicks } = perf.phraseSchedule(
    plan, ticksPerBar, player.feel, player.templateId
  );
  player.plan = plan; // kept so the grid can be rebuilt if Triplet toggles
  player.schedule = schedule;
  player.totalTicks = totalTicks;
  player.phraseReady = true;
  player.capturing = false;
  player.dirty = false;
  emitCapstate();
  Max.post(`phrase: ${plan.length} chords over ${totalTicks} ticks`);
}

/** Re-lay the installed phrase onto a new tick grid (Triplet toggled). */
function reschedulePhrase() {
  if (!player.plan) return;
  const previousTotal = player.totalTicks;
  const progress = previousTotal > 0 && player.beat >= 0 ? player.beat / previousTotal : 0;
  const { schedule, totalTicks } = perf.phraseSchedule(
    player.plan, ticksPerBar, player.feel, player.templateId
  );
  player.schedule = schedule;
  player.totalTicks = totalTicks;
  if (player.beat >= 0) player.beat = Math.min(totalTicks - 1, Math.round(progress * totalTicks));
}

/** Start the next cycle. LOOP replays the same schedule with no OSC at all. */
function beginPhraseCycle() {
  if (player.mode === "loop" && !player.dirty) {
    emitCapstate();
    return; // deterministic replay of the phrase already installed
  }
  if (player.nextPlan) {
    installPhrase(player.nextPlan); // pre-fetched: no gap at the boundary
    player.nextPlan = null;
    return; // caller's beat is already 0 -> the first chord sounds on this tick
  }
  player.phraseReady = false; // gate the clock rather than play a stale phrase
  // Rewind one tick: while gated every tick is swallowed, so the first tick
  // AFTER the phrase lands must advance to 0 and sound the phrase's first
  // chord. Leaving beat at 0 here would advance to 1 and drop it.
  player.beat = -1;
  player.capturing = true;
  emitCapstate();
  requestPhrase();
}

function phraseBeat() {
  if (!player.phraseReady) return; // gated: the phrase has not arrived yet
  if (player.hold) return; // vamp: don't advance, let the current chord sustain

  player.beat += 1;
  if (player.beat >= player.totalTicks) {
    if (player.mode === "oneshot") {
      playerStop("done");
      return;
    }
    player.beat = 0;
    beginPhraseCycle();
    if (!player.phraseReady) return; // still waiting on a fresh phrase
  }

  // REGEN: fetch the next phrase a bar early so the boundary never stalls.
  // Deliberately NOT gated on `dirty`: requestPhrase() reads the current bars/
  // key/cadence, so a pre-fetch made after a param change is already correct —
  // and gating on it would disable pre-fetch entirely (switching to regen sets
  // dirty, which only clears once a phrase installs).
  if (player.mode === "regen" && !player.nextPlan &&
      player.beat === Math.max(0, player.totalTicks - ticksPerBar)) {
    requestPhrase();
  }

  const chord = player.schedule.get(player.beat);
  if (chord) {
    sonifyChord(chord, "phrase");
    player.lastSounded = chord;
  }
}

function playerStart() {
  player.active = true;
  player.beat = -1;
  player.pending = null;
  player.lastSounded = null;
  player.phrase.clear();
  player.capturing = true; // first pass always captures
  player.dirty = false;

  if (player.engine === "phrase") {
    player.phraseReady = false; // the clock waits for the phrase; no silence, no wrong chord
    player.nextPlan = null;
    player.schedule.clear();
    Max.post(`player: start phrase ${player.mode} ${player.lengthBars} bars in ${currentKey()}`);
    Max.outlet(["status", "playing"]);
    emitCapstate();
    requestPhrase();
    return;
  }

  resetSession(); // fresh neural walk from the seed
  const t = TEMPLATES[player.templateId] || TEMPLATES[3];
  Max.post(
    `player: start ${player.mode} ${player.lengthBars} bars, template ${t.name}, seed ${player.seed}`
  );
  Max.outlet(["status", "playing"]);
  emitCapstate();
  submitChord(player.seed); // fetch the first chord to play on beat 0
}

function playerStop(reason) {
  if (!player.active) return; // idempotent — avoids playoff/toggle feedback loops
  player.active = false;
  previousVoicing = null;
  Max.outlet(["stop"]); // silence held notes
  Max.outlet(["playoff"]); // stop the transport metro + reset the PLAY toggle
  Max.outlet(["status", reason || "stopped"]);
  emitCapstate();
  Max.post(`player: ${reason || "stopped"}`);
}

/** Reroll: discard the captured phrase and walk a fresh one from the seed.
 *  Also resets Python's neural session so rnn/lstm genuinely start over
 *  (otherwise the hidden state persists and a "reroll" is not really fresh). */
function playerReroll() {
  if (!player.active) return;
  player.phrase.clear();
  player.capturing = true;
  player.beat = -1;
  player.pending = null;
  player.lastSounded = null;
  player.dirty = false;
  Max.outlet(["status", "reroll"]);
  emitCapstate();
  Max.post("player: reroll");
  if (player.engine === "phrase") {
    player.phraseReady = false; // gate, then walk in on the fresh phrase
    player.nextPlan = null;
    requestPhrase();
    return;
  }
  resetSession();
  submitChord(player.seed);
}

/** Begin a new phrase cycle at a boundary, honoring the current mode. */
function beginCycle() {
  // Queued rhythm change lands cleanly at the phrase boundary.
  if (player.pendingTemplateId != null) {
    player.templateId = player.pendingTemplateId;
    player.pendingTemplateId = null;
  }
  if (player.mode === "loop" && !player.dirty) {
    player.capturing = false; // replay the phrase we just captured
  } else {
    // REGEN, or LOOP after a param change: capture a fresh phrase. Re-seed from
    // the chord the previous phrase actually ended on (NOT `pending`, which is
    // frozen/stale after a loop replay), and clear the per-slot fallback state.
    player.seed = perf.lastPhraseChord([...player.phrase], player.seed);
    player.phrase.clear();
    player.capturing = true;
    player.pending = null;
    player.lastSounded = null;
  }
  player.dirty = false;
  emitCapstate();
}

function playerBeat() {
  if (!player.active) return;
  if (player.engine === "phrase") {
    phraseBeat();
    return;
  }
  player.beat += 1;

  // Cycle boundary: one-shot stops; loop/regen wrap into a new cycle.
  if (player.beat >= player.lengthBars * ticksPerBar) {
    if (player.mode === "oneshot") {
      playerStop("done");
      return;
    }
    player.beat = 0;
    beginCycle();
  }
  const b = player.beat;

  // Hold / vamp: keep sounding the current chord, don't advance the walk.
  if (player.hold) {
    if (isOnsetAt(b)) {
      const c = player.phrase.get(b) || player.pending || player.seed;
      sonifyChord(c, "hold");
    }
    return;
  }

  // Mid-cycle rhythm change on the bar downbeat (kept for one-shot/base parity;
  // during LOOP replay the template is frozen so the loop stays coherent).
  if (b % ticksPerBar === 0 && player.capturing && player.pendingTemplateId != null) {
    player.templateId = player.pendingTemplateId;
    player.pendingTemplateId = null;
  }

  if (!isOnsetAt(b)) return;

  if (player.capturing) {
    // Race-safe: if this slot's reply hasn't arrived, SUSTAIN the last sounded
    // chord instead of snapping back to the seed. `pending` is consumed (nulled)
    // so a stale reply can't repeat a slot later.
    const chord = perf.captureFallbackChord(player.pending, player.lastSounded, player.seed);
    player.pending = null;
    sonifyChord(chord, "player"); // play the current chord
    player.lastSounded = chord;
    player.phrase.set(b, chord); // record it for LOOP replay
    submitChord(chord); // ask Markov for its successor -> becomes pending
  } else {
    // LOOP replay — deterministic, no OSC round-trip.
    const chord = player.phrase.get(b) || player.lastSounded || player.seed;
    sonifyChord(chord, "loop");
    player.lastSounded = chord;
  }
}

Max.addHandler("play", (value) => {
  if (Number(value) !== 0) playerStart();
  else playerStop("stopped");
});

/** Eighth-note or quarter-triplet tick from a transport-synced metro in Max. */
Max.addHandler("beat", () => {
  playerBeat();
});

/** Choose the harmonic-rhythm template directly (1..7). */
Max.addHandler("template", (value) => {
  const id = Math.round(Number(value));
  if (TEMPLATES[id]) {
    player.templateId = id;
    player.pendingTemplateId = null;
    if (player.engine === "phrase") reschedulePhrase();
    Max.post(`player: template ${id} (${TEMPLATES[id].name})`);
  }
});

/**
 * Performable rhythm dial (0..1): sweeps harmonic-rhythm density from sparse
 * (one chord every two bars) to dense (a chord on every beat). The change is
 * queued and applied on the next bar downbeat while playing (musical), or
 * immediately when stopped. Emits the template name for on-screen feedback.
 */
function rhythmToTemplate(v) {
  return perf.rhythmTemplateFromDial(v);
}
Max.addHandler("rhythm", (value) => {
  const id = rhythmToTemplate(value);
  if (player.engine === "phrase") {
    // Phrase scheduling is local, so density can change without throwing away
    // the Python-generated harmony or waiting for a new network response.
    player.templateId = id;
    player.pendingTemplateId = null;
    reschedulePhrase();
  } else {
    player.pendingTemplateId = id;
    if (!player.active) player.templateId = id; // apply now when stopped
    player.dirty = true; // a LOOP re-captures with the new rhythm next cycle
  }
  Max.outlet(["rhythmname", TEMPLATES[id].name]);
});

/** Apply one of v4's named rhythmic feels. Numeric values are Feel-tab indices;
 * names are accepted as a debugging/automation convenience. */
function setFeel(value) {
  const numeric = Number(value);
  const feel = Number.isFinite(numeric) && String(value).trim() !== ""
    ? perf.feelFromIndex(numeric)
    : perf.normalizeFeel(value);
  player.feel = feel;
  ticksPerBar = feel === "triplet" ? 6 : 8;
  if (player.engine === "phrase") {
    reschedulePhrase();
  } else {
    player.dirty = true;
  }
  Max.outlet(["feelname", feel]);
  Max.post(`player: feel ${feel} (${ticksPerBar} ticks/bar)`);
}
Max.addHandler("feelidx", (value) => setFeel(value));
Max.addHandler("feel", (...atoms) => setFeel(atoms.join("")));

/** Set the predetermined length in bars. */
Max.addHandler("length", (value) => {
  const n = Math.round(Number(value));
  if (Number.isFinite(n) && n > 0) {
    player.lengthBars = n;
    player.dirty = true;
    Max.post(`player: length ${n} bars`);
  }
});

/** Explicit seed override (optional; the chain also tracks the latest chord). */
Max.addHandler("seed", (...atoms) => {
  const s = chordFromArgs(atoms);
  if (s) {
    player.seed = s;
    Max.post(`player: seed ${s}`);
  }
});

/* --- List selectors (replace typing): Seed / Key / Model dials ---------- *
 * Each 0..1 live.dial scrolls a fixed list; the chosen item is echoed to an
 * on-panel readout (seedname / keyname / modelname) so the performer sees the
 * selection without typing. See performance_map_v4.js for the lists.          */
Max.addHandler("seedsel", (v) => {
  player.seed = perf.seedFromDial(v);
  Max.outlet(["seedname", player.seed]);
});
Max.addHandler("keysel", (v) => {
  player.keyRoot = perf.keyRootFromDial(v); // 0..11 pitch class
  sendKey();                                 // emits keyname + /control/key
});
Max.addHandler("keymin", (v) => {
  player.keyMode = Number(v) !== 0 ? "min" : "maj";
  sendKey();
});
/** Audition the currently-selected seed chord immediately (preview button).
 * Previews the SELECTED seed directly (same path as testparse): it does NOT run
 * the Markov chain, does NOT mutate player.seed, and works with Python offline —
 * so the audition matches the seedname readout and PLAY's seed stays in sync. */
Max.addHandler("audition", () => sonifyChord(player.seed, "audition"));

/** Forward a model choice to Python. The lazy torch/checkpoint load for
 *  rnn/lstm blocks the (single-threaded) service for a moment, so the
 *  supervisor's heartbeat gets a grace window instead of calling it down. */
function sendModel(m) {
  Max.outlet(["modelname", m]);
  if (supervisor) supervisor.grace(20000);
  try {
    initOsc();
    sendOsc("/control/model", m);
  } catch (err) {
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
}

/** Generative model selector (markov / rnn / lstm / ngram) — forwarded. */
Max.addHandler("modelsel", (v) => sendModel(perf.modelFromDial(v)));

/**
 * Model selector fed by a live.tab. The last entry ("phrase") is not a registry
 * model but a different ENGINE: it asks Python for a whole phrase with its own
 * generated harmonic rhythm, instead of walking one chord per template onset.
 */
Max.addHandler("modelidx", (i) => {
  const m = perf.modelFromIndex(i);
  if (m === "phrase") {
    player.engine = "phrase";
    Max.outlet(["modelname", "phrase"]);
    Max.post("engine: phrase (sequence-level, learned harmonic rhythm)");
    if (player.active) playerReroll(); // swap engines cleanly at the next phrase
    return;
  }
  const wasPhrase = player.engine === "phrase";
  player.engine = "walk";
  sendModel(m);
  if (wasPhrase && player.active) playerReroll();
});

/**
 * Cadence (0..1): how strongly the phrase pulls home. In PHRASE mode it is both
 * the tonal gravity applied while generating and the probability of ending on
 * an authentic V -> I. In WALK mode it drives Python's per-step gravity, which
 * is the same musical idea at chord scale.
 */
Max.addHandler("cadence", (v) => {
  player.cadence = clamp01(v);
  if (player.engine === "phrase") {
    invalidatePhrase(); // the next cycle re-generates with the new pull
  } else {
    forwardDial("/control/gravity", player.cadence);
  }
});

/** Phrase length fed by a live.tab (sends the item INDEX 0..3 -> 2/4/8/16 bars). */
Max.addHandler("lenidx", (i) => {
  player.lengthBars = perf.barsFromIndex(i);
  invalidatePhrase();
  Max.outlet(["phraselenbars", player.lengthBars]);
});

/** Neural session mode control (auto | stateless | session | reset) — forwarded
 *  to Python's /control/session. Governs whether rnn/lstm carry hidden-state
 *  "memory" across chord steps. Markov is always stateless (reset is a no-op). */
Max.addHandler("session", (...atoms) => {
  const mode = atoms.map((a) => String(a ?? "").trim()).filter(Boolean).join(" ").trim().toLowerCase();
  if (!mode) {
    Max.outlet(["error", "empty session mode"]);
    return;
  }
  Max.outlet(["sessionmodename", mode]);
  try {
    initOsc();
    sendOsc("/control/session", mode);
  } catch (err) {
    Max.post(err.stack || err);
    Max.outlet(["error", String(err.message || err)]);
  }
});

/** Set the register centre used by the voicing engine (Max-side control). */
Max.addHandler("register", (value) => {
  const v = Number(value);
  if (Number.isFinite(v)) {
    const window = voicingGuard.registerWindow(v, voicingOptions.registerCenter);
    Object.assign(voicingOptions, window);
    previousVoicing = null; // do not pull the new register toward stale voices
    const suffix = window.registerCenter === Math.round(v) ? "" : ` (clamped from ${v})`;
    Max.post(
      `register center -> ${window.registerCenter} ` +
        `(range ${window.low}..${window.high})${suffix}`
    );
  }
});

/** Toggle nearest-voicing (voice leading) on/off. */
Max.addHandler("voiceleading", (value) => {
  voicingOptions.voiceLeadingEnabled = Number(value) !== 0;
  Max.post(`voice leading -> ${voicingOptions.voiceLeadingEnabled ? "on" : "off"}`);
});

/**
 * Explicitly override v4's full-chord sonification. `1` deliberately reduces
 * generated symbols to major/minor triads; `0` restores full parsed harmony.
 * The override survives later Voicing-dial changes.
 */
Max.addHandler("triadsonly", (value) => {
  triadsOnlyManualOverride = Number(value) !== 0;
  voicingOptions.triadsOnly = triadsOnlyManualOverride;
  // "triads only" must remain literal even if Voicing was previously in an
  // extension band. Restoring full harmony also restores that band's tensions.
  voicingOptions.extensions = triadsOnlyManualOverride
    ? []
    : perf.voicingLevelBands(voicingDialValue).extensions;
  previousVoicing = null; // voice count changes -> reset voice-leading history
  Max.post(`triads only -> ${voicingOptions.triadsOnly ? "on" : "off"}`);
});

/* --- performable colour knobs (live.dials, 0..1) ----------------------- */
function clamp01(v) {
  v = Number(v);
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
/** Encourage MAJOR chords (probability 0..1). */
Max.addHandler("colormajor", (v) => {
  voicingOptions.colorMajor = clamp01(v);
});
/** Encourage MINOR chords (probability 0..1). */
Max.addHandler("colorminor", (v) => {
  voicingOptions.colorMinor = clamp01(v);
});
/** Encourage 7th chords — adds a flat-7th (probability 0..1). */
Max.addHandler("color7th", (v) => {
  voicingOptions.color7th = clamp01(v);
});

/* --- Phrase controls (Spice performance device) ------------------------ *
 * Phrase Length dial, Phrase Mode (loop/regen/oneshot), Reroll, Hold.        */
Max.addHandler("phraselen", (v) => {
  player.lengthBars = perf.barsFromDial(v);
  invalidatePhrase();
  Max.outlet(["phraselenbars", player.lengthBars]);
});
Max.addHandler("phrasemode", (v) => {
  player.mode = perf.modeFromValue(v);
  player.dirty = true;
  Max.outlet(["phrasemodename", player.mode]);
  Max.post(`player: mode ${player.mode}`);
});
Max.addHandler("reroll", () => playerReroll());
Max.addHandler("hold", (v) => {
  player.hold = Number(v) !== 0;
  Max.post(`player: hold ${player.hold ? "on" : "off"}`);
});
/** Legacy Triplet automation alias. New sets use the seven-way Feel tab. */
Max.addHandler("triplet", (v) => {
  const on = Number(v) !== 0;
  if (on) setFeel("triplet");
  else if (player.feel === "triplet") setFeel("straight");
});

/* --- Voicing engine dials --------------------------------------------- *
 * Voicing/functional (basic->advanced) and Voice-Distance (Harmony Singer).  */
Max.addHandler("voicing", (v) => {
  voicingDialValue = clamp01(v);
  const b = perf.voicingLevelBands(voicingDialValue);
  voicingOptions.triadsOnly = triadsOnlyManualOverride === null
    ? false
    : triadsOnlyManualOverride;
  voicingOptions.voiceLeadingEnabled = b.voiceLeading;
  voicingOptions.extensions = triadsOnlyManualOverride === true ? [] : b.extensions;
  voicingOptions.drop2 = b.drop2;
  voicingOptions.spreadCap = b.spreadCap;
  previousVoicing = null; // voice count can change -> reset VL history
});
Max.addHandler("voicedistance", (v) => {
  const pos = perf.voiceDistancePosition(v);
  voicingOptions.voiceDistanceSteps = pos.steps;
  Max.outlet(["voicedistname", pos.name]);
});

/* --- Key composition from MPK key-set pads (root + mode) --------------- */
function sendKey() {
  const k = currentKey();
  voicingOptions.currentKey = k;
  // The phrase engine generates IN the key, so a key change must re-generate
  // and discard any phrase pre-fetched in the old one.
  if (player.engine === "phrase") invalidatePhrase();
  try {
    initOsc();
    sendOsc("/control/key", k);
  } catch (err) {
    Max.post(err.stack || err);
  }
  Max.outlet(["keyname", k]);
}
Max.addHandler("keyroot", (v) => {
  player.keyRoot = ((Math.round(Number(v)) % 12) + 12) % 12;
  sendKey();
});
Max.addHandler("keymode", (m) => {
  player.keyMode = String(m).toLowerCase().indexOf("min") === 0 ? "min" : "maj";
  sendKey();
});

/* --- MPK Mini Plus MIDI: Program-Change pads + CC joystick ------------- *
 * The patch feeds `pgm <n>` (from midiparse program outlet) and `cc <n> <v>`
 * (control-change outlet). All PC/CC meaning lives in performance_map_v4.js. */
Max.addHandler("pgm", (n) => {
  const a = perf.decodePgm(n);
  switch (a.action) {
    case "playtoggle":
      if (player.active) playerStop("stopped");
      else playerStart();
      break;
    case "reroll":
      playerReroll();
      break;
    case "holdtoggle":
      player.hold = !player.hold;
      Max.post(`player: hold ${player.hold ? "on" : "off"}`);
      break;
    case "modecycle":
      player.mode = perf.nextMode(player.mode);
      player.dirty = true;
      Max.outlet(["phrasemodename", player.mode]);
      break;
    case "length":
      player.lengthBars = a.arg;
      player.dirty = true;
      Max.outlet(["phraselenbars", a.arg]);
      break;
    case "keyroot":
      player.keyRoot = a.arg;
      sendKey();
      break;
    case "keymode":
      player.keyMode = a.arg;
      sendKey();
      break;
    default:
      break;
  }
});
Max.addHandler("cc", (num, val) => {
  const m = perf.ccToParam(num, val);
  if (m) forwardDial(`/control/${m.param}`, m.value);
});

/** Manual panic: forget history and tell Max to stop sounding notes. */
Max.addHandler("panic", () => {
  previousVoicing = null;
  Max.outlet(["stop"]);
});

Max.post("markov_osc_v4.js loaded — protocol v4 on OSC 9100/9101");
// The patch uses this edge, not an arbitrary load delay, to replay the current
// Live parameter values only after every handler above has been registered.
Max.outlet(["bridgeready", 1]);
