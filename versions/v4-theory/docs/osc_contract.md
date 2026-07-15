# OSC contract mirror (protocol v4)

V4 preserves the complete v3 contract and adds only isolated ports, a protocol
handshake, and Harmony Complexity. See [PLAN.md](../PLAN.md) for the inherited
core and [ARCHITECTURE_V4.md](ARCHITECTURE_V4.md) for the v4 planner design.

## V4 isolation and additions

| Direction | Address | Payload | Purpose |
|---|---|---|---|
| Max → Python | `/control/complexity` | float `0..1` | Select the permitted simple-to-advanced harmonic grammar |
| Python → Max | `/status/protocol` | string `"v4"` | Confirm that the peer supports v4 controls |
| Python → Max | `/status/complexity` | float `0..1` | Report the effective clamped theory setting |

V4 Python listens on `127.0.0.1:9100` and replies to Max on
`127.0.0.1:9101`. V3 remains on `9000/9001`. The v4 bridge caches
Complexity until it receives `/status/protocol "v4"` and reports the observed
state to its Max patch as `protocolstat v4`, `protocolstat legacy`, or
`protocolstat v?`.

The existing positional phrase message is not extended. Complexity is service
state:

```text
/phrase/request <key> <bars> [cadence] [seed]
/phrase/output  <chord> <duration> <chord> <duration> ...
```

## Inherited required addresses

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
| Max → Python | `/control/model` | string | Registry generator: `markov` / `rnn` / `lstm` / `ngram`; RNN/LSTM checkpoints load on demand |
| Python → Max | `/debug/mix` | string | Effective corpus weights (debug mode only) |

The v4 Model tab order is
`markov / rnn / lstm / ngram / phrase`. `markov` through `ngram` are valid
`/control/model` registry values. `phrase` selects the separate sequence
engine and sends `/phrase/request`; it is not sent to `/control/model`.

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

V4 ports: Python `9100`, Max `9101`, host `127.0.0.1`.

## Node → Max messages (in-patch, not OSC)

The inherited v3 message shapes above remain unchanged. `markov_osc_v4.js`
additionally emits these messages to the patch's `route status output error
chord notes stop` object. `output` stays backward-compatible; `chord`/`notes`/
`stop` drive the display and MIDI branch. V4 preserves the planner's emitted
extensions and alterations by default; downstream Voicing remains a separate
performance layer. This preservation also applies at Voicing `0`.
`triadsonly 1` is the explicit manual override for plain-triad reduction;
`triadsonly 0` restores the complete parsed chord, and the override survives
later Voicing changes.

| Message | Payload | Purpose |
|---|---|---|
| `status` | word | `ready` / `waiting` |
| `output` | symbol | raw Markov reply (unchanged) |
| `error` | code [detail] | passthrough or parser error |
| `chord` | symbol | normalized returned symbol for display |
| `notes` | midi ints | voiced notes from the returned v4 chord symbol |
| `stop` | — | silence held notes (N.C. / panic) |
| `protocolstat` | `v4`, `legacy`, or `v?` | backend compatibility state |
| `voicecount` | non-negative int | number of MIDI pitches emitted for the current chord; visible on the v4 panel |

V4's local (non-OSC) rhythm messages are `rhythm <0..1>` for saved density,
`feelidx <0..6>` for the seven-way Feel tab, and `feel <name>` for debugging or
automation. The legacy `triplet 0|1` message remains an alias so older saved
automation still loads. Straight/syncopated playback ticks eight times per bar;
Triplet ticks six times per bar.
