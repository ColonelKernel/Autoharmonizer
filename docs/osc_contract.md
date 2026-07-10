# OSC contract mirror (protocol v3) — v1 core spec is ../PLAN.md

See [PLAN.md](../PLAN.md) sections **OSC contract** and **Max OSC stack**.

Required addresses:

| Direction | Address | Payload |
|---|---|---|
| Max → Python | `/chord/input` | string |
| Python → Max | `/chord/output` | string |
| Python → Max | `/status/ready` | int `1` |
| Python → Max | `/error` | string |
| Max → Python | `/control/ping` | none |
| Python → Max | `/status/pong` | int `1` |
| Max → Python | `/control/reload` | none |

## Spice controls (v2, corpus blend)

Additive and backward-compatible: a service without these still works, and a
patch that never sends them keeps the startup defaults. See
[PLAN.md](../PLAN.md) *Spice / corpus blend* and `python/src/blend.py`.

| Direction | Address | Payload | Purpose |
|---|---|---|---|
| Max → Python | `/control/color` | float `0..1` | Corpus morph: folk → pop → classical → jazz |
| Max → Python | `/control/adventure` | float `0..1` | Temperature: common → rare/surprising |
| Max → Python | `/control/spice` | float `0..1` | Macro — drives Color and Adventure together |
| Max → Python | `/control/key` | string | Song key (`C:maj` / `A:min`) for transposition |
| Max → Python | `/control/gravity` | float `0..1` | Harmonic gravity — cadence pull toward tonic/dominant |
| Max → Python | `/control/model` | string | Generative backend: `markov` / `rnn` / `lstm` (all live; JazzNet loaded on demand) |
| Python → Max | `/debug/mix` | string | Effective corpus weights (debug mode only) |

## Neural session (v3, RNN/LSTM)

Added by the merged `autoharmonizer-max` backend. Additive and backward-
compatible — the Max device ignores any status address it doesn't display.

| Direction | Address | Payload | Purpose |
|---|---|---|---|
| Max → Python | `/control/session` | string | `auto` \| `stateless` \| `session` \| `reset` |
| Max → Python | `/phrase/request` | `key bars [cadence] [seed]` | Ask the phrase engine for a whole `bars`-long progression |
| Python → Max | `/phrase/output` | string | The generated phrase (reply to `/phrase/request`) |
| Python → Max | `/status/model` | string | Active model, echoed on ping / switch / ready |
| Python → Max | `/status/session` | string + int | Effective mode (`session`/`stateless`) + step count |

RNN/LSTM run stateful under `auto` (default): hidden state carries across chord
steps with temperature sampling and first-step input exclusion, so each
`/chord/input` advances the progression. Markov is always stateless. See
[COMBINED_DEVICE.md](../COMBINED_DEVICE.md) for the backend flags.

Default ports: Python `9000`, Max `9001`, host `127.0.0.1`.

## Node → Max messages (in-patch, not OSC)

The OSC contract above (Max ↔ Python) is **unchanged**. `markov_osc.js`
additionally emits these messages to the patch's `route status output error
chord notes stop` object. `output` stays backward-compatible; `chord`/`notes`/
`stop` drive the display and the major/minor-triad MIDI branch.

| Message | Payload | Purpose |
|---|---|---|
| `status` | word | `ready` / `waiting` |
| `output` | symbol | raw Markov reply (unchanged) |
| `error` | code [detail] | passthrough or parser error |
| `chord` | symbol | normalized returned symbol for display |
| `notes` | midi ints | voiced major/minor triad |
| `stop` | — | silence held notes (N.C. / panic) |
