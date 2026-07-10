# The Python-free ONNX devices

Two new Max for Live devices generate chords entirely inside Node. No Python, no
UDP, no background process to launch, supervise, or debug.

| Device | Window | What it is |
|---|---|---|
| `max/Chord Markov Performer (ONNX).amxd` | 584 × 169 | The compact strip: tabs, one Spice macro, five dials. |
| `max/Chord Markov Sequencer (ONNX).amxd` | 960 × 169 | The wide strip: Color and Adventure split out of the Spice macro, VoiceDist and Audition restored, every readout the patch can produce. |

The Python-backed devices — `Chord Markov Performer.amxd` and
`Chord Markov Sequencer (Spice).amxd` — are **unchanged and still work**. They
share `chord_parser.js` and `performance_map.js` with the ONNX devices, but not
the bridge. `python/` is now needed only to *build* the model files, never to run
them.

## Install

```bash
cd max && npm install       # onnxruntime-node is already vendored in node_modules
```

Then drag either `.amxd` onto a MIDI track. The engine light goes amber
(`loading models`) then green (`onnx ready`).

`node.script` reads the JS from disk and the models from `../data`, so the device
ships as **this folder**, not as a single frozen `.amxd`. Copying the `.amxd`
alone to another machine will load the panel but never light green.

## Why it needed no retraining

The RNN and LSTM checkpoints are the ones you already had. `python/scripts/export_jazznet_onnx.py`
re-exports them as **single-step** graphs — one token plus a hidden state in,
logits plus the next hidden state out — so Node can drive the recurrence itself
one chord at a time.

That export drops `pack_padded_sequence`, which is only legal because at sequence
length 1 it is the identity. The test suite asserts that rather than assuming it:
the packed and unpacked paths differ by **exactly 0.0**. Against PyTorch the
exported graphs agree to `4.8e-6` on a single step and `3.3e-6` across a five-step
carry — the carry is the test that would catch a mis-wired recurrence, which a
single-step comparison cannot see.

## Two backends, one interface

`onnxruntime-node` is an N-API v6 addon, so it is ABI-independent and loads under
Max's bundled Node 22. It is vendored (258 MB) so an offline `npm install` cannot
break the device.

If it fails to load anyway — an Intel Max, a broken postinstall, a platform whose
native binary is not vendored — the device silently falls back to
`engine/neural_backend_js.js`, a pure-JS forward pass over the same weights, and
the panel reads `js fallback` instead of `onnx ready`. Both are exercised by the
test suite.

Neither path is remotely close to a performance budget. One beat at 120 bpm is
500 ms:

| | boot | markov | rnn | lstm | 8-bar phrase |
|---|---|---|---|---|---|
| ONNX | 85 ms | 0.038 ms | 0.112 ms | 0.124 ms | 0.180 ms |
| pure JS | 15 ms | 0.031 ms | 0.237 ms | 0.542 ms | 0.344 ms |

## Architecture

```
onnx_markov_osc.js          Max-facing bridge (no OSC, no supervisor)
  ├─ emit()                 the result sink -> voicing -> Max.outlet
  ├─ engine/local_engine.js model switch + session + dials  (was: registry.py + osc_service.py)
  │    ├─ neural_engine.js  sampling; ONNX or pure-JS backend behind one interface
  │    ├─ markov_engine.js  corpus blend + fallback ladder
  │    └─ phrase_engine.js  root-motion semi-Markov chain + cadence
  ├─ chord_parser.js        REUSED unchanged (voicing -> MIDI)
  └─ performance_map.js     REUSED unchanged (dials, phrase scheduling)
```

`emit()` is still the single internal sink, and it still speaks in the old OSC
addresses (`/chord/output`, `/phrase/output`, `/status/*`). Those are now just
routing keys into a function call. Nothing sends them over a socket.

### The bridge is a copy, not a refactor

`onnx_markov_osc.js` duplicates the player from `markov_osc.js` — the clock
gating, loop/regen/hold, the triplet grid. Three shipping devices load
`markov_osc.js`; extracting a shared core would mean editing that file, and the
only thing the two bridges would share is transport glue. The *pure* logic
(`chord_parser.js`, `performance_map.js`, `engine/*`) is already single-source.

**A fix to the player belongs in both files.** That is the cost of the trade.

### One place the two bridges genuinely differ

`markov_osc.js` receives phrases over UDP, i.e. on a later turn of the event
loop. `requestPhrase()` here generates them synchronously, so it delivers the
result through `setImmediate`. This is load-bearing, not cosmetic:
`beginPhraseCycle()` rewinds `beat` to `-1` before requesting, and a synchronous
install would leave it there for the tick still in flight, swallowing the
phrase's first chord.

## Panel differences

The Relink button became **Reload**: with no Python to relink to, it rebuilds the
in-process engine and re-reads the corpora. Route outlets 18/19
(`backendstate` / `backendtext`) now carry the local engine's load state rather
than a process's health, so the light means:

* **amber** `loading models` — the ONNX sessions or the weight file are loading
* **green** `onnx ready` / `js fallback` — which forward pass is actually live
* **red** — see the Max console; `markov only` means the neural models failed but
  the corpus chain and the phrase generator still work

On the wide Spice device, **Spice is a macro over Color and Adventure**. Only
Color and Adventure are banged at load, so the two dials the panel shows are the
ones that initialize the engine; Spice takes over the moment you touch it. (The
compact Performer has no separate Color/Adventure, so it bangs Spice as before.)

Because there is no fixed UDP port any more, **two ONNX devices can run in the
same Live Set.** The Python-backed devices could not: they shared ports 9000/9001.

## Verify

```bash
cd max
npm test                                  # bridge + engine + device suites
node onnx_device_e2e.js                   # the device, with Python stopped
python3 build_onnx_patches.py --check     # the original devices are byte-identical
```

`onnx_device_e2e.js` is the one that earns the claim in this document's title. It
booby-traps `child_process`, `dgram` and `net` before loading the bridge, and
records any attempt to require `node-osc` or `backend_supervisor.js`. Then it
drives all four engines (markov / rnn / lstm / phrase) through the real handlers
and asserts they emit playable MIDI. Pointing the same traps at the old
`markov_osc.js` trips them immediately, which is what makes the passing result
mean something.

To exercise the fallback path deliberately:

```bash
npm run test:fallback     # hides onnxruntime-node; must print "pure-JS backend"
```

`npm test` runs both, so a regression in either backend fails the suite.

## Regenerating

```bash
# 1. models (needs Python + torch; the ONLY thing Python is for)
cd python && python3 scripts/export_jazznet_onnx.py
#    -> data/jazznet/onnx/{rnn,lstm}.onnx, vocab.json, weights_{rnn,lstm}.json, parity_fixture.json
python3 -m pytest tests/test_onnx_parity.py

# 2. patches + devices
cd ../max && python3 build_onnx_patches.py
node build_amxd.js chord_markov_performer_onnx.maxpat       "Chord Markov Performer (ONNX).amxd"
node build_amxd.js chord_markov_sequencer_spice_onnx.maxpat "Chord Markov Sequencer (ONNX).amxd"
```

`build_onnx_patches.py` refuses to finish if any of the six original files has
changed, and validates the generated patches for dangling patchlines, out-of-range
outlet indices, duplicate Live parameter names, macro-bank drift, off-panel boxes
and overlapping controls — all of which Max fails on silently.

## Notes on behaviour

The neural walks can settle on a repeated chord (`C:maj7 -> C:maj7 -> ...`). This
is the trained model plus auto-feed, not a porting bug: the input chord is masked
only on the *first* step of a session, and Python does exactly the same thing from
the same seed. Reroll, or raise Adventure, to break out.

Draws are **not** reproducible against Python. Python's `random.Random` is a
Mersenne Twister that JS cannot reproduce, so the ports are verified against
*distributions* — blend probabilities to `1e-9`, phrase duration and root-motion
histograms by total-variation distance — never against individual samples.
