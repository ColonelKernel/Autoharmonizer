# Autoharmonizer Max — Markov Chord Generator

[![Web port: AutoHarm (live)](https://img.shields.io/badge/Web%20port-AutoHarm-2ea44f?logo=github&logoColor=white)](https://github.com/ColonelKernel/AutoHarm-Web)

> A browser port of this device — same harmonic brain, no Max required — lives at [**AutoHarm-Web**](https://github.com/ColonelKernel/AutoHarm-Web) ([try it live](https://colonelkernel.github.io/AutoHarm-Web/)).

> **This is the combined `FinalMaxUPF` build.** The rich UPF performer device
> (`max/Chord Markov Sequencer (Spice).amxd`) now runs on the merged **protocol
> v3** backend with stateful RNN/LSTM neural sessions taken from the
> `autoharmonizer-max` repo. Start here: **[COMBINED_DEVICE.md](COMBINED_DEVICE.md)**.
> The sections below are the original UPF docs (the Markov / corpus-blend side).

A local Max + Python system that sends one chord symbol to a Python service over OSC/UDP and receives one next chord sampled from a first-order Markov chain. Chord labels (e.g. `G:7`, `C:maj7`) are treated as opaque strings. There is also a Python-free path — the ONNX devices in [ONNX_DEVICE.md](ONNX_DEVICE.md) run generation entirely inside Max.

**Protocol version:** v3 — see [COMBINED_DEVICE.md](COMBINED_DEVICE.md). The Markov / corpus-blend behavior described below is the original v1 core, unchanged inside the v3 backend.
**Canonical spec:** [PLAN.md](PLAN.md)

## How it works

```
Max patch                         Python service
──────────                        ──────────────
[chord input]                     load CSV transition table
     │  /chord/input (UDP)              │
     └──────────────────────────►  weighted sample
                                        │
     ◄──────────────────────────  /chord/output (UDP)
[output display]
```

- **Max** handles UI, OSC transport, status, and downstream routing.
- **Python** loads the CSV, validates transitions, samples the next chord, and replies over OSC.
- Communication uses **localhost UDP** on fixed ports (`9000` / `9001`).

## Requirements

| Component | Requirement |
|---|---|
| Python | 3.9+ |
| Max | Max 8+ with Node for Max (included in standard installs) |
| Max npm package | `node-osc` (installed once via patch button or `npm install` in `max/`) |
| Python packages | `python-osc`, `pytest` (see `python/requirements.txt`) |

## Quick start

### 1. Install Python dependencies

```bash
cd python
python3 -m pip install -r requirements.txt
```

### 2. Start the Python service

```bash
cd python
python3 -m src.main
```

You should see log output confirming the CSV loaded and the OSC server is listening on `127.0.0.1:9000`.

### 3. Open the Max patch

Open [`max/chord_markov_device.maxpat`](max/chord_markov_device.maxpat) in Max.

**First time only:** click **npm install** in the patch (or run `npm install` in the `max/` folder).

1. Click **ping** — status should show `ready` when `/status/pong` is received.
2. Enter a chord (e.g. `G:7`) and click **send**.
3. The sampled next chord appears in **output** (e.g. `C:maj` or `C:maj7`).

### 4. Verify without Max (optional)

```bash
cd python
python3 scripts/osc_smoke_test.py --spawn-service
```

Expected output:

```text
OK: /chord/input 'G:7' -> /chord/output 'C:maj7'
```

## Configuration

Settings are passed via **CLI flags** or **environment variables** (env vars override defaults).

| Setting | CLI flag | Env var | Default |
|---|---|---|---|
| CSV path (legacy chain) | `--csv` | `MARKOV_CSV` | `data/markov_openbook.csv` |
| Corpora JSON (blend) | `--corpora` | `MARKOV_CORPORA` | `data/markov_corpora_t.json` |
| Color (0–1) | `--color` | `MARKOV_COLOR` | `0.5` |
| Adventure (0–1) | `--adventure` | `MARKOV_ADVENTURE` | `0.35` |
| Key | `--key` | `MARKOV_KEY` | `C:maj` |
| Bind host | `--host` | `MARKOV_HOST` | `127.0.0.1` |
| Listen port | `--port` | `MARKOV_PORT` | `9000` |
| Max reply host | `--max-host` | `MARKOV_MAX_HOST` | `127.0.0.1` |
| Max reply port | `--max-port` | `MARKOV_MAX_PORT` | `9001` |
| Fallback policy | `--fallback` | `MARKOV_FALLBACK` | `echo_input` |
| Debug OSC | `--debug` | `MARKOV_DEBUG` | off |
| Random seed | `--seed` | `MARKOV_SEED` | unset |

When `markov_corpora_t.json` is present the service runs in **blend mode**
(Color/Adventure dials active); otherwise it falls back to the single-chain
legacy CSV. See the **Spice / corpus blend** section below.

Example with deterministic sampling:

```bash
MARKOV_SEED=42 python3 -m src.main --csv ../data/markov_openbook.csv --debug
```

### Fallback policies

When an unknown chord is received, Python emits `/error` and applies the configured policy:

| Policy | Behavior |
|---|---|
| `echo_input` (default) | Return the input chord unchanged |
| `global_top` | Return the most frequent global target chord |
| `random_source` | Sample a random known source, then one of its outputs |
| `error_only` | Emit `/error` only; no output |

## OSC protocol (summary)

| Direction | Address | Payload |
|---|---|---|
| Max → Python | `/chord/input` | string |
| Python → Max | `/chord/output` | string |
| Python → Max | `/status/ready` | int `1` |
| Python → Max | `/error` | string |
| Max → Python | `/control/ping` | _(none)_ |
| Python → Max | `/status/pong` | int `1` |
| Max → Python | `/control/reload` | _(none)_ |
| Max → Python | `/control/color` | float `0..1` |
| Max → Python | `/control/adventure` | float `0..1` |
| Max → Python | `/control/spice` | float `0..1` |
| Max → Python | `/control/key` | string |
| Max → Python | `/control/model` | string (`markov`/`rnn`/`lstm`) |

Full contract: [PLAN.md](PLAN.md) · [docs/osc_contract.md](docs/osc_contract.md)

## Spice / corpus blend

Instead of one pre-merged chain, the service keeps **four corpora separate** and
mixes them live from two performable dials:

| Corpus | Flavour | Colour position |
|---|---|---|
| Nottingham | British/Irish folk — 3-chord, dominant-7 cadences | `0.0` |
| POP909 | Chinese pop — diatonic, broad vocab | `0.33` |
| Bach chorales | classical functional harmony, secondary dominants | `0.66` |
| OpenBook | jazz lead sheets — 7ths/9ths/alterations | `1.0` |

- **Color** morphs the corpus mixture along the path above (piecewise blend, so
  mid positions are genuine two-corpus mixes).
- **Adventure** is a sampling temperature: low picks the common resolution, high
  reaches down the tail for rarer, more colourful chords.
- **Spice** is a one-knob macro over both.
- Blending happens in **key-normalized (C/Am) space**, then the result is
  transposed back to the current **Key** — so folk, pop, classical and jazz mix
  by harmonic *function*, not absolute pitch.

Data lives in `data/markov_corpora_t.json` — first-order transition counts
nested per corpus (`pop909`, `nottingham`, `openbook`, `bach`, `all`),
key-transposed. Rebuild / add the Bach corpus with:

```bash
cd python
python3 scripts/build_bach_markov.py     # adds the "bach" corpus via music21
```

See it end-to-end without Max:

```bash
python3 scripts/osc_smoke_test.py --spawn-service --demo
```

## Generative models (Markov / RNN / LSTM)

The **Model** dial in the Spice device (`/control/model`) switches the active
generator via an `EngineRegistry` (`python/src/engines/`):

| Model | Engine | Notes |
|---|---|---|
| `markov` | the corpus-blend Markov engine above | default; Color/Adventure/Spice/Key apply |
| `rnn` | JazzNet `BaselineRNN` | pretrained; loaded on demand |
| `lstm` | JazzNet `ChordLSTM` | pretrained; loaded on demand |

The neural engines are the [JazzNet](https://github.com/scalzadonna/JazzNet)
baselines. Two integration details:

- **Weights are committed** under `data/jazznet/checkpoints/{rnn,lstm}/*.pt`, so
  the neural models work out of the box. To re-fetch them from scratch:
  ```bash
  python3 scripts/fetch_jazznet_assets.py   # -> data/jazznet/checkpoints/{rnn,lstm}/*.pt
  ```
  If they are ever missing, selecting `rnn`/`lstm` reports "unavailable" and the
  service stays on Markov (never breaks).
- **Stateful, de-repeated.** JazzNet is frame-wise (a single `[BOS, chord]`
  context echoes the input), so `engines/registry.py` drives each neural engine
  with a rolling context and skips immediate repeats — each `/chord/input`
  advances to a new chord, forming a real progression. JazzNet's dash-flat
  spelling (`B-:maj7`) is translated to/from this project's `Bb:maj7` spelling
  at the boundary (`engines/notation.py`).

`torch` is only imported when `rnn`/`lstm` is actually selected, so a
Markov-only setup does not need it.

## Testing

```bash
cd python
python3 -m pytest -q
```

Tests cover CSV loading, Markov sampling, fallback behavior, and localhost OSC round-trips.

## Repository layout

```text
autoharmonizer-max/
├── README.md                          # This file
├── PLAN.md                            # Canonical spec for the v1 Markov core (v3 adds on top)
│
├── data/
│   ├── markov_openbook.csv            # Default transition corpus (~900 rows, 89 sources)
│   └── chord_progressions_transitions.csv  # Smaller corpus for smoke tests
│
├── markov_openbook.csv                # Source copy of openbook corpus (repo root)
├── chord_progressions_transitions.csv # Source copy of small corpus (repo root)
│
├── docs/
│   └── osc_contract.md                # OSC address mirror of PLAN.md
│
├── max/
│   ├── chord_markov_device.maxpat     # Standalone Max/MSP patch (UI + Node OSC bridge)
│   ├── markov_osc.js                  # Node-for-Max OSC client/server
│   ├── package.json                   # npm dependency on node-osc
│   └── README.md                      # Max-specific setup and troubleshooting
│
└── python/
    ├── requirements.txt               # python-osc, pytest
    ├── pytest.ini                     # Pytest config
    │
    ├── src/                           # Python OSC + Markov service
    │   ├── __init__.py
    │   ├── config.py                  # CLI/env parsing, OSC constants, path resolution
    │   ├── csv_loader.py              # CSV validation, duplicate merge, normalization
    │   ├── markov_engine.py           # Weighted sampling and fallback logic
    │   ├── osc_service.py             # OSC server/client, message handlers, reload
    │   └── main.py                    # Service entry point
    │
    ├── scripts/
    │   └── osc_smoke_test.py          # End-to-end OSC test without Max
    │
    └── tests/
        ├── test_csv_loader.py         # CSV schema, merge, validation tests
        ├── test_markov_engine.py      # Sampling, fallback, seed determinism
        └── test_osc_flow.py           # Localhost OSC integration tests
```

## File reference

### Root

| File | Purpose |
|---|---|
| `README.md` | Project overview, setup, and file guide |
| `PLAN.md` | Full implementation plan: architecture, OSC contract, build phases, acceptance criteria |
| `markov_openbook.csv` | Original transition data exported from the openbook corpus |
| `chord_progressions_transitions.csv` | Smaller transition set for quick testing |

### `data/`

Runtime copies of the CSV files used by the Python service. Default path: `data/markov_openbook.csv`.

CSV schema:

```text
chord_from,chord_to,count,probability
G:7,C:maj,529,0.462
G:7,C:maj7,241,0.2105
...
```

### `docs/`

| File | Purpose |
|---|---|
| `osc_contract.md` | Quick-reference mirror of the OSC addresses defined in `PLAN.md` |

### `max/`

| File | Purpose |
|---|---|
| `chord_markov_device.maxpat` | Max patch with chord input, send/ping/reload/npm buttons, status/output/error displays, and a symbol outlet |
| `markov_osc.js` | Node-for-Max bridge: sends/receives OSC to Python on ports 9000/9001, handles 500 ms reply timeout |
| `package.json` | Declares `node-osc` npm dependency for the bridge script |
| `README.md` | Max-specific controls, ports, and troubleshooting |

### `python/src/`

| File | Purpose |
|---|---|
| `config.py` | Parses CLI flags and env vars; defines OSC address constants and protocol version; resolves CSV paths relative to repo root |
| `csv_loader.py` | Loads and validates the transition CSV; merges duplicate rows; normalizes probabilities; builds in-memory lookup tables and a global fallback pool |
| `markov_engine.py` | Samples the next chord from weighted transitions; handles unknown/empty input via configurable fallback policies |
| `osc_service.py` | Runs the OSC UDP server and reply client; handles `/chord/input`, `/control/ping`, `/control/reload`; emits status, error, and optional debug messages |
| `main.py` | Starts the service, configures logging, handles graceful shutdown on SIGINT/SIGTERM |

### `python/scripts/`

| File | Purpose |
|---|---|
| `osc_smoke_test.py` | Sends `/control/ping` and `/chord/input` to a running (or spawned) service; asserts `/chord/output` is received |

### `python/tests/`

| File | Purpose |
|---|---|
| `test_csv_loader.py` | Tests header validation, openbook loading, duplicate merge, empty chord rejection |
| `test_markov_engine.py` | Tests known-chord sampling, unknown-chord fallback, empty input, seed determinism |
| `test_osc_flow.py` | In-process OSC integration tests for ping/pong, chord output, and error+echo fallback |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Max status stays `waiting` | Python service not running, or wrong port |
| `reply timeout` in Max | Python stopped, wrong port, or `node-osc` not installed |
| `node-osc missing` in Max | Click **npm install** in the patch, or run `npm install` in `max/` |
| Garbled / no OSC reply | Confirm Python is running; test with `python3 scripts/osc_smoke_test.py --spawn-service` |

## Further reading

- [PLAN.md](PLAN.md) — full spec, build phases, and acceptance criteria
- [max/README.md](max/README.md) — Max patch controls and setup
- [docs/osc_contract.md](docs/osc_contract.md) — OSC address quick reference
