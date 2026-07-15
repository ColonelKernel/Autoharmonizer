# FinalMaxUPF v4 Theory

V4 is the isolated theory-aware development version of FinalMaxUPF. It begins
from the working v3 project, preserves the v3 OSC shapes, and adds a separate
simple-to-advanced Harmony Complexity control and protocol handshake.

- Version: `4.0.0-dev`, recorded in [`VERSION`](VERSION).
- User manual: [`docs/Chord_Markov_Performer_v4_User_Manual.pdf`](docs/Chord_Markov_Performer_v4_User_Manual.pdf)
  with an editable [`DOCX`](docs/Chord_Markov_Performer_v4_User_Manual.docx)
  and [`Markdown source`](docs/USER_MANUAL_V4.md).
- Architecture and research roadmap:
  [`docs/ARCHITECTURE_V4.md`](docs/ARCHITECTURE_V4.md).
- Frozen v3 recovery artifact:
  [`../../archive/README.md`](../../archive/README.md).
- Dataset provenance and unresolved license review:
  [`data/dataset_provenance.json`](data/dataset_provenance.json).

The root-level `data/`, `max/`, and `python/` folders remain v3. Do all
v4 development and testing inside `versions/v4-theory/`.

## What v4 changes

V4 separates four musical decisions that were previously easy to conflate:

| Control | Behavior |
|---|---|
| Color | Chooses the corpus/style mixture |
| Adventure | Changes sampling entropy from predictable to surprising |
| Gravity/Cadence | Controls tonal pull and phrase resolution |
| Complexity | Controls which harmonic devices are allowed, from diatonic triads to chromatic/modulatory harmony |

The inherited generators remain useful and intentionally behave differently:

| Engine | Behavior |
|---|---|
| Markov | Transparent, corpus-driven, immediate local transitions |
| RNN | Compact stateful neural continuity |
| LSTM | Longer recurrent context than the RNN |
| N-gram | Inspectable order-1–4 memory with longest-context backoff; stabilizes recurring cells and turnarounds |
| Phrase | Learned harmonic rhythm and whole-phrase length/cadence guarantees |

The v4 Model tab order is `markov / rnn / lstm / ngram / phrase`. The first
four names select registry generators through `/control/model`. `phrase` is
the sequence engine and continues to use `/phrase/request` instead of being
sent as a registry model.

## Chord-safe playback and rhythmic Feel

The v4 Performer now treats a chord as one held MIDI event. It flushes the
previous voicing immediately before the next attack, then holds every pitch
until the following chord, Stop, or Panic. It does not use independent
`makenote` timers: delayed note-offs from an earlier chord can no longer turn
off shared tones in the new chord and leave one note sounding.

The panel's **Voices** readout shows how many MIDI pitches v4 actually emitted.
Normal generated harmony reports at least 3. A zero means silence or a parser
error. If the readout says 3 or more but the instrument still sounds like one
pitch, the downstream Ableton instrument is in mono/legato mode rather than the
generator sending a single note.

**Rhythm** remains the saved sparse-to-dense control (two-bar hold through four
quarter attacks). The new **Feel** tab changes where those full-chord attacks
land:

`Straight / Push / Tresillo / Clave 3-2 / Clave 2-3 / Upbeats / Triplet`

Straight and syncopated feels use an eighth-note transport grid; Triplet uses a
six-tick quarter-triplet grid. Phrase mode now applies Rhythm and Feel locally,
retains fractional beat durations, preserves chord order and total length, and
keeps a final downbeat cadence anchored. Walk mode uses the same Feel patterns.

The variable-order n-gram is built from the bundled JazzNet sequences and ships
as `data/theory_ngram.json`. Markov, RNN, LSTM, and n-gram candidates all pass
through the same functional theory planner before selection; the phrase engine
applies the same tier policy to its sequence model. A conditional Transformer,
explicit modulation planner, and graph/Tonnetz voice-leading scorer remain
research targets rather than claimed features.

## Runtime isolation

V3 and v4 use different localhost OSC ports:

| Endpoint | V3 | V4 |
|---|---:|---:|
| Python service | `9000` | `9100` |
| Max receiver | `9001` | `9101` |

V4 Python reports `/status/protocol "v4"`. The v4 Max bridge waits for that
handshake before sending `/control/complexity`, so it cannot silently treat a
v3 backend as v4.

## Install

Run from the repository root:

```bash
cd versions/v4-theory/python
python3 -m pip install -r requirements.txt
```

Install the v4 Max-side dependencies separately. Node does not resolve the
root v3 `max/node_modules` from this nested version:

```bash
cd versions/v4-theory/max
npm install
```

The `.amxd` container does not embed its JavaScript or npm dependencies. Keep
it with this v4 `max/` folder.

## Launch v4

Start the backend from the v4 Python directory. The explicit ports make the
launch safe even if a local default has not yet been migrated:

```bash
cd versions/v4-theory/python
python3 -m src.main --port 9100 --max-port 9101
```

Then open the v4-only device:

```text
versions/v4-theory/max/Chord Markov Performer v4.amxd
```

The editable source patch is:

```text
versions/v4-theory/max/chord_markov_performer_v4.maxpat
```

Keep using the root v3 devices for v3 sessions. The v4 bridge is
`max/markov_osc_v4.js` and is intentionally separate from the inherited
bridge.

## Smoke test without Max

Run from the v4 Python directory:

```bash
cd versions/v4-theory/python
python3 scripts/osc_smoke_test.py --spawn-service --python-port 9100 --max-port 9101
```

This spawns the service on the isolated v4 ports, pings it, sends a chord, and
waits for the OSC response.

## Test v4

Run Python and Max tests in separate processes from their own version
directories. Both v3 and v4 expose a top-level Python package named `src`, so
one root-level pytest collection can import the wrong package.

Python:

```bash
cd versions/v4-theory/python
python3 -m pytest -q
```

Max/Node:

```bash
cd versions/v4-theory/max
npm test
```

Run the deterministic model/complexity evaluation matrix from `python/`:

```bash
python3 scripts/evaluate_harmony.py \
  --models markov ngram rnn lstm \
  --complexities 0 .25 .5 .75 1 \
  --seeds 7 19 41 --steps 32 \
  --output reports/harmony-evaluation.json
```

The report tracks explicit chord-symbol rate, theoretical note counts,
single-note risk, complexity tiers, diatonicity, cadences, repetition,
fallbacks, and the raw fixed-seed progressions.

The Python ONNX parity tests require `numpy` and Python
`onnxruntime` in addition to the runtime requirements. A skipped optional
parity module is not equivalent to a full release verification.

Verify the v3 archive independently:

```bash
shasum -a 256 -c archive/SHA256SUMS
unzip -t archive/FinalMaxUPF-v3-393c98e-2026-07-13.zip
```

Run the unchanged v3 suites when checking backward compatibility:

```bash
cd python
python3 -m pytest -q
```

```bash
cd max
npm test
```

## Complexity contract

Max sends:

```text
/control/complexity <float 0..1>
```

`0` requests the simplest legal realization; `1` permits the most advanced
configured grammar. The v4 Max device initializes the control at `0.5`, the
compatibility tier that preserves existing model symbols, and flushes that
value only after the v4 handshake. The theory layer interprets the continuum
as ordered permissions:

1. diatonic triads;
2. diatonic sevenths, inversions, suspensions;
3. secondary dominants, borrowing, diminished approaches;
4. upper extensions, altered dominants, and substitutions;
5. altered or remote chromatic harmony, with controlled phrase-level
   modulation reserved for the hierarchical-planner stage.

Complexity is not another temperature control. A high-complexity phrase can
still choose a plain tonic when that is the coherent musical decision.
`4.0.0-dev` currently tests chord-level gating and realization; it does not
claim that a trained modulation planner has shipped.

The established phrase wire format remains:

```text
/phrase/request <key> <bars> [cadence] [seed]
/phrase/output  <chord> <duration> <chord> <duration> ...
```

Complexity is service state; it is not inserted into the old positional phrase
arguments.

## Audible chord preservation

V4 voices the complete theory-emitted chord by default, including sevenths,
extensions, alterations, and slash basses. This remains true at Voicing `0`;
the Voicing dial changes register, voice leading, spread, and optional added
tensions without silently reducing the backend chord.

Plain-triad reduction is an explicit manual override:

```text
triadsonly 1   reduce generated symbols to major/minor triads
triadsonly 0   restore the complete parsed harmony
```

That override survives later Voicing-dial changes until it is explicitly
changed again.

## Dataset policy

No new raw corpus is bundled merely because it appears in a catalog. Before
adding ChoCo, DCML, JAAH, Haydn annotations, or another MTG-linked dataset:

1. verify the exact release and each partition's license;
2. record attribution and raw/derived redistribution rights;
3. checksum the download;
4. preserve composition-level train/validation/test splits;
5. keep restricted audio outside Git;
6. record the preprocessing command and resulting artifact checksum.

The current provenance manifest deliberately labels unresolved licenses as
unverified. It must not be read as permission to redistribute those sources.

## Layout

```text
versions/v4-theory/
├── VERSION
├── README.md
├── PLAN.md
├── data/
│   ├── dataset_provenance.json
│   ├── theory_ngram.json
│   └── existing compact runtime assets
├── docs/
│   ├── ARCHITECTURE_V4.md
│   └── osc_contract.md
├── max/
│   ├── chord_markov_performer_v4.maxpat
│   ├── Chord Markov Performer v4.amxd
│   ├── markov_osc_v4.js
│   ├── performance_map_v4.js
│   ├── voicing_guard_v4.js
│   └── package.json
└── python/
    ├── requirements.txt
    ├── src/
    ├── scripts/evaluate_harmony.py
    └── tests/
```

The inherited v3 documentation remains available in `PLAN.md`,
`COMBINED_DEVICE.md`, `ONNX_DEVICE.md`, and `docs/osc_contract.md`. For new
work, this README and `docs/ARCHITECTURE_V4.md` are the v4 entry points.
