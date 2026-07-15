/**
 * build_amxd.js — wrap chord_markov_device.maxpat into a Max for Live
 * MIDI-Effect device (Chord Markov Device.amxd).
 *
 * Run from this folder:
 *   node build_amxd.js                                          # main MIDI device
 *   node build_amxd.js <input.maxpat> <output.amxd>             # any MIDI patch
 *   node build_amxd.js <input.maxpat> <output.amxd> <type>      # type = mmmm|aaaa|iiii
 *      (aaaa = Audio Effect, e.g. the audio-analyzer device)
 *
 * .amxd container format (the minimal variant Live also writes, e.g. as seen
 * in stock/3rd-party MIDI devices):
 *
 *   "ampf" | uint32(4) | "mmmm" | "ptch" | uint32(payloadSize) | <JSON> | 0x00
 *
 * - "mmmm" is the device-type code for a MIDI Effect (audio = "aaaa",
 *   instrument = "iiii").
 * - The trailing 0x00 byte IS included in the ptch payload size.
 * - The patcher JSON is the plain .maxpat with a few Max-for-Live device
 *   metadata keys injected (parameters/openrect/…) so Live loads it cleanly.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
// Optional args: input .maxpat and output .amxd (names or paths).
const SRC = path.resolve(DIR, process.argv[2] || "chord_markov_device.maxpat");
const OUT = path.resolve(DIR, process.argv[3] || "Chord Markov Device.amxd");
// Device type: mmmm = MIDI Effect (default), aaaa = Audio Effect, iiii = Instrument.
const TYPE = process.argv[4] || "mmmm";
if (TYPE.length !== 4) throw new Error(`device type must be 4 chars, got "${TYPE}"`);

function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }

const doc = JSON.parse(fs.readFileSync(SRC, "utf8"));
const P = doc.patcher;

// --- Max for Live device metadata (added only in the .amxd, not the .maxpat) ---
// Device window in Live's device strip. Respect a size the patch already set
// (the Spice performer panel sizes its own window); else use the default.
if (!Array.isArray(P.openrect)) P.openrect = [0.0, 0.0, 860.0, 400.0];
P.latency = 0;
P.is_mpe = 0;
P.external_mpe_tuning_enabled = 0;
P.minimum_live_version = "";
P.minimum_max_version = "";
P.platform_compatibility = 0;
P.saved_attribute_attributes = { default_plcolor: { expression: "" } };
// Register every exposed live.* parameter object so Live sees them (and they
// become macro-mappable). Entry form: id -> [longname, shortname, instance].
P.parameters = {
  parameterbanks: { "0": { index: 0, name: "", parameters: ["-", "-", "-", "-", "-", "-", "-", "-"] } },
  inherited_shortname: 1,
};
const bank0 = P.parameters.parameterbanks["0"].parameters;
let bankSlot = 0;
for (const b of P.boxes) {
  const box = b.box;
  const vo = box.parameter_enable === 1 && box.saved_attribute_attributes && box.saved_attribute_attributes.valueof;
  if (!vo || !vo.parameter_longname) continue;
  const longname = vo.parameter_longname;
  const shortname = vo.parameter_shortname || longname;
  P.parameters[box.id] = [longname, shortname, 0];
  if (bankSlot < bank0.length) bank0[bankSlot++] = longname; // surface on the device's parameter strip
}

const jsonText = JSON.stringify(doc, null, "\t");
const payload = Buffer.concat([Buffer.from(jsonText, "utf8"), Buffer.from([0x00])]);
const amxd = Buffer.concat([
  Buffer.from("ampf", "latin1"),
  u32(4),
  Buffer.from(TYPE, "latin1"), // device type (mmmm MIDI / aaaa Audio / iiii Instrument)
  Buffer.from("ptch", "latin1"),
  u32(payload.length),
  payload,
]);
fs.writeFileSync(OUT, amxd);

// self-check: round-trip the container back to valid JSON
const b = fs.readFileSync(OUT);
if (b.slice(8, 12).toString("latin1") !== TYPE) throw new Error("bad device type");
const i = b.indexOf(Buffer.from("ptch"));
const size = b.readUInt32LE(i + 4);
const parsed = JSON.parse(b.slice(i + 8, i + 8 + size - 1).toString("utf8"));
if (20 + payload.length !== amxd.length) throw new Error("size mismatch");
console.log(
  `wrote "${path.basename(OUT)}"  (${amxd.length} bytes, type ${TYPE}, ` +
    `${parsed.patcher.boxes.length} boxes, ${parsed.patcher.lines.length} lines)`
);
