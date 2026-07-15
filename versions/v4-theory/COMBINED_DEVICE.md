# FinalMaxUPF — combined Max for Live device

This folder is the **UPF Autoharmonizer rich-UI device** wired to the
**stateful neural backend** from the `autoharmonizer-max` repo. It is one
self-contained project: the rich Max for Live performer device on top, the
merged Python OSC service underneath. Neither source repo was modified — this is
an assembled copy.

## The device

**`max/Chord Markov Sequencer (Spice).amxd`** — the flagship rich-UI device.
Its compact Presentation-mode performer panel has: Seed / Key / **Model**
(markov · rnn · lstm) list-dials, Color · Adventure · **Spice** · Rhythm,
Voicing · Voice-Distance · Major/Minor/7th, phrase controls (length / loop-
regen-oneshot / reroll / hold), transport (PLAY / BPM / sync / bars), and
chord/notes/status readouts. It sonifies the generated chords as triads through
the instrument placed after it. (The other `.amxd` files in `max/` are the
sibling UPF devices; they share the same `markov_osc.js` and also work against
this backend.)

## What was taken from `autoharmonizer-max` ("the modifications")

Only the **neural/session backend** — the part that makes the RNN/LSTM models
generate real progressions instead of echoing the input. Merged into the Python
service (`python/src/`), keeping UPF's corpus-blend Markov intact:

| Brought in | What it does |
|---|---|
| `engines/neural_session.py` | Carries the RNN/LSTM **hidden state** across chord steps |
| `engines/neural_sampler.py` | Temperature sampling + first-step **input exclusion** + auto-feed |
| `engines/rnn_engine.py`, `lstm_engine.py`, `jazznet_inference.py`, `base.py` | Session-aware neural inference (from the AH fork) |
| protocol **v3** additions | `/control/session`, `/status/model`, `/status/session` |
| config / registry / osc_service wiring | `--neural-temperature`, `--session-mode`, step counting |

UPF's rich Markov side is unchanged: Color/Adventure/Spice/Key/Gravity corpus
blending (Nottingham · POP909 · Bach · OpenBook) still drives the `markov`
model, and the `notation` boundary keeps JazzNet's `B-:maj7` spelling out of the
Max parser (it sees `Bb:maj7`).

**The Max side (`.amxd` + `markov_osc.js`) was not changed.** The rich UI already
sends `/control/model` and the Spice dials; the neural upgrade is entirely in
Python and is active automatically (session mode defaults to `auto` → stateful
for rnn/lstm, stateless for markov). The Adventure/Spice dial now also drives
neural sampling temperature, so one dial spices all three models.

## Run it

```bash
# 1. Python deps (torch is only needed for rnn/lstm)
cd python
python3 -m pip install -r requirements.txt

# 2. Start the service (defaults: markov active, session auto)
python3 -m src.main

# 3. In Ableton: drop max/"Chord Markov Sequencer (Spice).amxd" on a MIDI track
#    BEFORE an instrument. First run: click "npm install" in the device, then
#    ping. Pick a Model, set a Seed, press PLAY.
```

JazzNet checkpoints for rnn/lstm are already in `data/jazznet/checkpoints/`.

## Backend controls (new)

| CLI / env | Default | Meaning |
|---|---|---|
| `--model` / `CHORD_MODEL` | `markov` | Startup model |
| `--session-mode` / `SESSION_MODE` | `auto` | `auto` = stateful rnn/lstm; `stateless`; `session` |
| `--neural-temperature` / `NEURAL_TEMPERATURE` | `1.5` | RNN/LSTM softmax temperature (>1 = more variety) |
| `--neural-exclude-input` | on | Mask the input chord on the first neural step |
| `--session-max-steps` / `SESSION_MAX_STEPS` | `64` | Auto-reset a neural session after N steps |

OSC (Max ⇄ Python): `/control/model <markov|rnn|lstm>`,
`/control/session <auto|stateless|session|reset>`, and status replies
`/status/model`, `/status/session <mode> <step>` (the device ignores status
addresses it doesn't display, so nothing breaks).

## Verification

- `cd python && python3 -m pytest -q` → **152 passed** (corpus blend, Markov,
  OSC round-trips, notation, ONNX parity, the phrase engine, and the neural-session tests).
- End-to-end over real localhost UDP (driven like the Max device): markov
  generation, live switch to rnn/lstm, **stateful session stepping** (step count
  advances), clean `Bb`-style spelling to the parser, and all Spice/session
  controls error-free.
- The Max device itself must be verified in Ableton (cannot be run headlessly);
  the `.amxd` and its JS are the unchanged, working UPF device.
