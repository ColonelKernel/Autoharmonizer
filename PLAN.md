# Max + Python OSC Markov Chord Generator Plan

This document is the **canonical specification** for a Max device that communicates with a Python service over OSC/UDP to transform one input chord into one output chord using a first-order Markov chain stored in CSV. Protocol version: **v1**.

## Objective

Build a small system with three clear responsibilities:

- Max handles user interaction, testing UX, and downstream musical integration.
- Python handles CSV loading, Markov transition lookup, weighted sampling, validation, and reply messaging.
- OSC over UDP provides loose coupling between both processes.

The implementation should favor simple local operation on one machine first, using `127.0.0.1` and fixed ports, then leave room for later extension to remote hosts or multiple clients.

## Scope

### In scope

- One input chord symbol, one generated output chord symbol.
- First-order Markov chain based on `chord_from -> chord_to` transitions from CSV.
- Bidirectional OSC messaging between Max and Python.
- Error reporting, startup signaling, logging, and manual test controls.
- Validation checkpoints so the coding agent can stop, verify, and correct issues before continuing.

### Out of scope for v1

- Higher-order Markov chains.
- Harmonic parsing beyond string labels.
- Audio rendering in Python.
- Multi-user networking or binding to `0.0.0.0`.
- Full DAW packaging or installer generation.
- Max for Live device packaging (v1 is a standalone `.maxpat` for Max/MSP).

## Assumptions

- The Markov CSV already exists and follows the schema `chord_from,chord_to,count,probability`.
- Default data file: `data/markov_openbook.csv` (copied or symlinked from repo-root `markov_openbook.csv`). A smaller smoke-test file `data/chord_progressions_transitions.csv` may be used during early development.
- Chord labels such as `G:7` and `C:maj7` are treated as opaque tokens in v1.
- Max and Python run on the same machine during initial development.
- Python binds only to `127.0.0.1` in v1.
- UDP message loss is acceptable for v1, but visible status, timeouts, and retry-friendly behavior are still required.

## Proposed architecture

### Components

1. **Max patch (`max/chord_markov_device.maxpat`)**
   - Standalone Max/MSP patch (not Max for Live in v1).
   - Receives or captures an input chord.
   - Sends OSC to Python.
   - Receives OSC reply from Python.
   - Displays status, error, and generated chord.
   - Optionally forwards output to MIDI or other Max logic.

2. **Python service**
   - Loads and validates the CSV.
   - Builds in-memory transition tables grouped by `chord_from`.
   - Runs an OSC server to receive chord requests.
   - Runs an OSC client to send replies back to Max using `python-osc`.

3. **CSV data source**
   - Stores transition counts and probabilities.
   - Is loaded at startup and optionally reloadable by command.

### Communication model

Use separate ports for each direction so each side has one listening socket and one sending target.

Default local configuration:

| Setting | Value | Notes |
|---|---|---|
| Host | `127.0.0.1` | Same-machine development default; do not bind `0.0.0.0` in v1. |
| Python receive port | `9000` | Max sends requests here. |
| Max receive port | `9001` | Python sends replies here. |
| Transport | UDP / OSC | Max uses CNMAT OSC objects; Python uses `python-osc`. |
| Reply timeout | `500 ms` | Max waits this long for `/chord/output` before showing a timeout error. |

### Startup and readiness (default)

Avoid relying on a one-shot `/status/ready` broadcast at Python startup, because Max may not be listening yet.

Default readiness flow:

1. Python loads CSV, opens its OSC server on `127.0.0.1:9000`, then sends `/status/ready` with payload `1` (best effort).
2. Max opens `udpreceive` on port `9001`, then sends `/control/ping` (no arguments).
3. Python replies with `/status/pong` payload `1`.
4. Max sets its status indicator to **ready** on first `/status/pong` or `/status/ready`.
5. After Python restart, Max re-sends `/control/ping` to re-establish readiness.

## OSC contract

Define the protocol before implementation. **`PLAN.md` is the canonical contract**; `docs/osc_contract.md` may mirror it but must not diverge.

### Example message trace

```text
Max  -> Python:  /chord/input   s  "G:7"
Python -> Max:   /chord/output  s  "C:maj"
Python -> Max:   /debug/probability  f  0.462
Python -> Max:   /debug/candidates   i  18
Python -> Max:   /debug/input_echo   s  "G:7"
Python -> Max:   /debug/fallback_used i  0
```

### Required addresses

| Direction | OSC address | Payload | Purpose |
|---|---|---|---|
| Max -> Python | `/chord/input` | `string` | Request next chord from current chord. |
| Python -> Max | `/chord/output` | `string` | Return selected next chord. |
| Python -> Max | `/status/ready` | `int` (`1`) | Signal service startup success (best effort). |
| Python -> Max | `/error` | `string` | Report recoverable errors. |
| Max -> Python | `/control/ping` | _(none)_ | Health check; sent after Max bind and after Python restart. |
| Python -> Max | `/status/pong` | `int` (`1`) | Health response. |
| Max -> Python | `/control/reload` | _(none)_ | Reload CSV without restart. |

### Optional debug addresses

| Direction | OSC address | Payload | Purpose |
|---|---|---|---|
| Python -> Max | `/debug/probability` | `float` | Probability of selected transition. |
| Python -> Max | `/debug/candidates` | `int` | Number of available next states. |
| Python -> Max | `/debug/input_echo` | `string` | Echo received chord for traceability. |
| Python -> Max | `/debug/fallback_used` | `int` | `1` if fallback logic was triggered, else `0`. |

Debug messages are emitted only when Python debug mode is enabled (default off).

### Spice / corpus blend addresses (v2, additive)

Backward-compatible extension: v1 clients ignore these and keep working. The
service blends four key-normalized per-corpus chains (`pop909`, `nottingham`,
`openbook`, `bach`) from `data/markov_corpora_t.json`, then transposes the
sampled chord back to the current key. Implementation: `python/src/blend.py`,
`python/src/corpus_loader.py`, `python/src/chord_vocab.py`.

| Direction | OSC address | Payload | Purpose |
|---|---|---|---|
| Max → Python | `/control/color` | `float` `0..1` | Corpus morph: folk → pop → classical → jazz |
| Max → Python | `/control/adventure` | `float` `0..1` | Sampling temperature: common → rare |
| Max → Python | `/control/spice` | `float` `0..1` | Macro over Color + Adventure |
| Max → Python | `/control/key` | `string` | Song key (`C:maj` / `A:min`) for transposition |
| Python → Max | `/debug/mix` | `string` | Effective corpus weights (debug only) |

### Contract rules

- Chord symbols are UTF-8 strings sent as OSC string arguments.
- OSC addresses are stable and must not be renamed without updating both sides.
- Error messages should be human-readable.
- Debug messages must not be required for core operation.
- Protocol version `v1` is recorded in Python constants and Max patch comments.
- Duplicate sends from Max are acceptable; Python treats each `/chord/input` independently.
- If Max does not receive `/chord/output` within 500 ms, it shows a timeout error and allows the user to retry.

## Max OSC stack (default)

Raw `udpsend` / `udpreceive` carry UDP bytes, not OSC messages. v1 uses the **CNMAT OSC externals**:

| Role | Objects |
|---|---|
| Pack outgoing OSC | `o.pack`, `o.prepend` |
| Send | `udpsend` |
| Receive | `udpreceive` |
| Route incoming OSC | `o.route`, `o.unpatch` |

Canonical outgoing pattern for chord input:

```text
[chord symbol] -> prepend s -> o.pack /chord/input -> udpsend 127.0.0.1 9000
```

Incoming routing handles at minimum: `/chord/output`, `/status/ready`, `/status/pong`, `/error`, and optional `/debug/*` addresses.

If CNMAT is unavailable in the target environment, stop and document the substitute OSC pack/route library before continuing; do not send raw string payloads over UDP and assume Python will parse them.

## Configuration (default)

Python reads configuration from **CLI flags with environment-variable overrides**:

| Setting | CLI flag | Env var | Default |
|---|---|---|---|
| CSV path | `--csv` | `MARKOV_CSV` | `data/markov_openbook.csv` |
| Bind host | `--host` | `MARKOV_HOST` | `127.0.0.1` |
| Listen port | `--port` | `MARKOV_PORT` | `9000` |
| Max reply host | `--max-host` | `MARKOV_MAX_HOST` | `127.0.0.1` |
| Max reply port | `--max-port` | `MARKOV_MAX_PORT` | `9001` |
| Fallback policy | `--fallback` | `MARKOV_FALLBACK` | `echo_input` |
| Debug mode | `--debug` | `MARKOV_DEBUG` | off |
| Random seed | `--seed` | `MARKOV_SEED` | unset (non-deterministic); use `42` in tests |

Example:

```bash
MARKOV_SEED=42 python -m src.main --csv data/markov_openbook.csv
```

## Data handling plan

### CSV validation

The Python service validates the CSV at startup **before** opening the OSC service port.

Validation checks:

1. File exists and is readable.
2. Header contains at least these required fields: `chord_from`, `chord_to`, `count`, `probability`.
3. `count` parses as a non-negative integer.
4. `probability` parses as a non-negative float.
5. No empty or whitespace-only `chord_from` or `chord_to` values.
6. Duplicate `(chord_from, chord_to)` rows are merged: counts summed, probabilities recomputed from merged counts, and merges logged in `stats`.
7. Probability sums per `chord_from` are checked; renormalize if sum drifts more than `0.01` from `1.0` (tolerate minor float rounding).
8. After grouping, at least one source chord exists and the global fallback pool (top target chords by total count) is non-empty.

### In-memory model

Target data shape in Python:

```python
transitions = {
    "G:7": [
        {"to": "C:maj", "count": 529, "prob": 0.462},
        {"to": "C:maj7", "count": 241, "prob": 0.2105},
    ]
}
```

Recommended derived structures:

- `transitions_by_source`: grouped raw rows.
- `weighted_choices_by_source`: tuple lists ready for sampling.
- `global_fallback_pool`: list of globally common target chords (default fallback source).
- `stats`: source chord count, row count, normalization fixes, duplicates merged.

### Sampling behavior

For each incoming source chord:

1. Strip leading/trailing whitespace from the input string.
2. Reject empty strings: emit `/error` with message `empty chord input` and do not emit `/chord/output`.
3. Look up all candidate rows for that `chord_from`.
4. Normalize probabilities if needed.
5. Sample one `chord_to` with weighted randomness (`random.choices` or equivalent).
6. Return the selected chord on `/chord/output`.
7. When debug mode is enabled, emit debug addresses listed above.

Unknown chord fallback policies (configurable via `--fallback` / `MARKOV_FALLBACK`):

| Policy | Behavior |
|---|---|
| `echo_input` **(v1 default)** | Emit `/error`, then return the input chord unchanged on `/chord/output`. |
| `global_top` | Emit `/error`, then return the most frequent global target chord. |
| `random_source` | Emit `/error`, then sample a random known source and one of its outputs. |
| `error_only` | Emit `/error` only; no `/chord/output`. |

## Max device requirements

### Functional requirements

- Manual chord input field for quick testing.
- Send trigger button.
- Host and port UI controls (defaults: `127.0.0.1`, Python port `9000`, Max receive port `9001`).
- Connection/status indicator driven by ping/pong or `/status/ready`.
- Output chord display.
- Error display or console routing, including reply timeout messages.
- Optional toggle to show debug messages.
- Optional symbol outlet for downstream Max logic (MIDI mapping deferred).

### Max patch modules

Suggested internal patch structure:

1. **Input module** — text entry or symbol input.
2. **OSC sender module** — CNMAT pack + `udpsend` for `/chord/input`, `/control/ping`, `/control/reload`.
3. **OSC receiver module** — `udpreceive` + CNMAT route for replies and status.
4. **UI/state module** — ready state, last sent/received chord, last error, reply timeout timer (500 ms).
5. **Output module** — emits the generated chord as a symbol.

### Max validation checkpoints

- Can a fixed OSC test message be sent to Python?
- Does Max receive a fixed reply from Python?
- Do `/status/pong`, `/status/ready`, and `/error` route correctly?
- Does a 500 ms timeout appear when Python is stopped?
- Do host and port UI changes affect transport correctly?
- Can the patch recover after Python is restarted via `/control/ping`?

## Python service requirements

### Functional requirements

- Configurable CSV path, host, and ports (CLI + env vars; see Configuration).
- Startup CSV load with validation before serving.
- OSC listener for incoming chord and control messages.
- Weighted sampling engine with optional `MARKOV_SEED`.
- OSC client reply path using `python-osc`.
- Structured logging to console.
- Reload and ping endpoints.

### Concurrency and reload safety

- `python-osc` dispatches handlers on a background thread.
- CSV reload swaps the in-memory transition table atomically (build new table, then replace under a lock).
- On reload failure, keep the previous valid table and emit `/error`; do not enter a broken state.
- Keep handler work short; do not block the OSC thread on file I/O beyond a normal reload.

### Suggested Python modules

```text
python/
  requirements.txt
  src/
    config.py          # CLI + env parsing, constants (protocol v1, OSC addresses)
    csv_loader.py
    markov_engine.py
    osc_service.py     # combined OSC server + client dispatch
    main.py
  tests/
    test_csv_loader.py
    test_markov_engine.py
    test_osc_flow.py
  scripts/
    osc_smoke_test.py  # Phase 1.5: send /chord/input, assert /chord/output
```

### Python validation checkpoints

- Does CSV loading fail clearly on schema issues?
- Are duplicate transitions merged consistently with logged counts?
- Do grouped probabilities normalize correctly?
- Does `/chord/input` produce `/chord/output` for a known chord?
- Does an unknown chord trigger configured fallback behavior?
- Does startup emit `/status/ready` only after successful load?
- Does `/control/reload` rebuild state safely under concurrent requests?
- Does `/control/ping` always produce `/status/pong`?

## Recommended build order

This sequence leaves room for explicit verification after each stage.

### Phase 1: Define interfaces

Deliverables:

- OSC contract (this document).
- Port and configuration defaults.
- CSV schema note and default file choice.
- Fallback policy: `echo_input`.

Validation gate:

- Agent confirms Max and Python specs reference identical OSC addresses and payload types.

### Phase 1.5: Python OSC smoke test (no Max)

Deliverables:

- `scripts/osc_smoke_test.py` that sends `/chord/input "G:7"` and listens for a reply on port `9001`.

Validation gate:

- Smoke script passes against the Phase 2 hardcoded Python service before Max work begins.

### Phase 2: Build Python skeleton

Deliverables:

- Config loader (CLI + env).
- Minimal OSC service with hardcoded reply path.

Validation gate:

- `/chord/input "G:7"` returns fixed `"C:maj"` on `/chord/output`.
- Startup sends `/status/ready 1`.
- `/control/ping` returns `/status/pong 1`.
- Errors are visible in logs.

### Phase 3: Build Max transport patch

Deliverables:

- Standalone `.maxpat` with CNMAT OSC wiring.
- Manual input UI, send trigger, status/error UI, 500 ms timeout.

Validation gate:

- Max can trigger Python and display the fixed reply.
- Max reaches ready state via ping/pong after bind.
- Restarting Python and re-pinging restores normal flow without patch changes.

### Phase 4: Implement CSV loader

Deliverables:

- CSV parser, schema validator, duplicate merge, group-by-source map, probability normalization.

Validation gate:

- Unit tests pass with good and bad CSV samples.
- Loader reports row counts, source chord counts, merges, and normalization actions.

### Phase 5: Implement Markov engine

Deliverables:

- Weighted sampler, unknown-chord fallback, optional debug metadata, `MARKOV_SEED` support.

Validation gate:

- Repeated calls for a known chord roughly match expected distribution over many samples (use `MARKOV_SEED=42` in tests).
- Unknown, empty, and whitespace-only inputs behave per policy.

### Phase 6: Integrate full path

Deliverables:

- End-to-end Max -> Python -> Max flow with real sampling.

Validation gate:

- Manual tests pass for known chords, unknown chords, and malformed inputs.
- Debug messages remain optional and non-blocking.

### Phase 7: Harden for use

Deliverables:

- Reload command, ping/pong health check, improved logging, basic usage notes in `max/README.md`.

Validation gate:

- Python reloads data without crashing; failed reload preserves prior table.
- Max accurately reflects ready/not-ready state.
- Common failure cases produce useful messages.

## Acceptance criteria

| Area | Acceptance criterion |
|---|---|
| Transport | Max sends `/chord/input` and receives `/chord/output` over OSC/UDP on localhost. |
| Readiness | Max reaches ready via ping/pong; recovers after Python restart. |
| Timeouts | Max shows an error if no reply within 500 ms. |
| Data load | Python loads and validates CSV before serving; default file is `markov_openbook.csv`. |
| Markov behavior | Known chords produce weighted random outputs from valid `chord_to` candidates. |
| Fallbacks | Unknown chords emit `/error` and apply `echo_input` fallback by default. |
| UX | Max exposes manual testing controls, status, and output display. |
| Security | Python binds to `127.0.0.1` only in v1. |
| Observability | Both sides provide enough logging or UI to debug routing problems. |

## Test matrix

Implement tests progressively and stop after each block to verify results.

### Unit tests (automated)

- CSV header validation.
- Numeric parsing validation.
- Duplicate row merge.
- Probability normalization.
- Weighted sampling returns only legal targets.
- Unknown, empty, and whitespace-only chord fallback behavior.
- Deterministic output with `MARKOV_SEED=42`.

### Integration tests (automated, Python-side)

- Python receives OSC message and returns correct address and payload type.
- `/control/ping` returns `/status/pong 1`.
- Reload command updates active transitions.
- Reload failure preserves previous table.

### Integration tests (manual, Max-side)

- Max receives and routes `/chord/output`.
- Max receives and routes `/error`.
- Max timeout fires when Python is stopped.
- Max recovers after Python restart via ping.

### Manual tests

| Test | Input | Expected result |
|---|---|---|
| Known chord | `G:7` | Returns one of the legal transitions from CSV. |
| Unknown chord | `X:???` | Emits `/error` and echoes input (`echo_input`). |
| Empty string | `""` | Emits `/error`; no `/chord/output`. |
| Whitespace only | `"   "` | Same as empty string. |
| Python restart | send after restart | Ping restores ready; normal flow resumes. |
| Reply timeout | Python stopped | Max shows timeout after 500 ms. |
| Bad CSV at startup | malformed file | Python refuses service start. |
| Bad CSV on reload | malformed file | `/error`; previous table remains active. |

## Error handling policy

| Condition | Behavior |
|---|---|
| Invalid CSV at startup | Do not open OSC server; exit with clear log message. |
| Unknown chord | Emit `/error`; apply configured fallback (default `echo_input`). |
| Empty or whitespace-only chord | Emit `/error` (`empty chord input`); no output. |
| Malformed OSC payload | Emit `/error`; ignore message. |
| Port bind failure | Fail loudly with actionable log output. |
| Reload failure | Keep previous valid transition table; emit `/error`. |
| Lost reply (Max-side) | Show timeout error after 500 ms; user may retry. |

## Logging and observability

### Python logs

Log at least:

- Service start and effective config (host, ports, CSV path, fallback policy).
- CSV load summary (rows, sources, merges, normalizations).
- Ready state.
- Incoming chords and selected outputs when debug mode is on.
- Errors, fallback usage, reload results.

### Max observability

- Visible ready indicator (from ping/pong or `/status/ready`).
- Last input chord.
- Last output chord.
- Last error string (including timeouts).
- Optional debug message display toggle.

## Suggested repository layout

```text
project-root/
  PLAN.md                         # canonical spec (this file)
  markov_openbook.csv             # source corpus (copy or symlink into data/)
  chord_progressions_transitions.csv
  max/
    chord_markov_device.maxpat
    README.md
  python/
    requirements.txt
    src/
      config.py
      csv_loader.py
      markov_engine.py
      osc_service.py
      main.py
    tests/
      test_csv_loader.py
      test_markov_engine.py
      test_osc_flow.py
    scripts/
      osc_smoke_test.py
  data/
    markov_openbook.csv           # default runtime path
    chord_progressions_transitions.csv
  docs/
    osc_contract.md               # optional mirror of PLAN.md OSC section
```

## Coding agent brief

> Build a local Max + Python system where a standalone Max/MSP patch sends one chord symbol to Python over OSC/UDP and Python returns one next chord sampled from a first-order Markov chain loaded from `data/markov_openbook.csv`. Keep chord strings opaque in v1. Use CNMAT OSC objects in Max and `python-osc` in Python. Define the OSC contract first (this document is canonical), then implement Python transport with a hardcoded reply and an OSC smoke script, then Max transport with ping/pong readiness and a 500 ms reply timeout, then CSV loading with duplicate merge, then weighted sampling with `echo_input` fallback, then reload and health checks. After each phase, stop and validate before proceeding. Do not assume a step works without a runnable verification. Bind Python to `127.0.0.1` only. Prefer simple localhost defaults, visible logs, and stable OSC addresses.

## Implementation notes for the agent

- Keep configuration in CLI flags and env vars; do not hardcode ports or paths in multiple places.
- Mirror OSC address constants in Python `config.py` and Max patch comments; keep them identical to this document.
- Avoid mixing chord-generation logic with transport logic.
- Use `MARKOV_SEED=42` for deterministic unit and distribution tests.
- Make fallback behavior explicit and configurable.
- Preserve the last valid transition table on reload failure.
- Leave extension points for later features: history-aware generation, Max for Live packaging, confidence display, or note-level rendering.

## Future extensions

Possible later improvements:

- Higher-order chains based on chord history.
- Beat-synchronous triggering from Max transport.
- Max for Live device wrapper.
- Symbol-to-voicing generation inside Max.
- Confidence/probability visualization.
- Corpus switching by style or song section. **(v2: implemented as a live
  Color/Adventure/Spice blend across pop909/nottingham/bach/openbook — see the
  Spice addendum above.)**
- Beat-synchronous phrase performance. **(v2: the Spice device plays performable
  8/16/24/32-bar phrases with loop/regen/oneshot modes, Voicing and Voice-Distance
  dials, and full MPK Mini Plus mapping — keys/pads/knobs/joystick. Pure mappings
  in `max/performance_map.js`; voicing in `max/chord_parser.js`.)**
- Remote host support with explicit non-localhost bind.

## Definition of done

The project is done for v1 when the standalone Max patch can send a chord like `G:7`, Python can read `markov_openbook.csv`, choose a valid next chord such as `C:maj` or `C:maj7` according to weighted probabilities, and Max can receive and display that response reliably through OSC/UDP on localhost—with ping/pong readiness, 500 ms timeout handling, and `echo_input` fallback for unknown chords.
