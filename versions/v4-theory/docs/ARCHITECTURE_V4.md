# FinalMaxUPF v4 theory architecture

This document defines the v4 boundary: an isolated development copy of v3,
plus a theory-aware planning layer that can move from simple to advanced
harmony without treating randomness as harmonic complexity.

`VERSION` currently identifies this tree as `4.0.0-dev`. Features described
as targets are architectural contracts, not claims that a trained checkpoint or
dataset has already been added.

## Isolation and compatibility

The working v3 tree remains at the repository root. Its frozen recovery
artifact is documented in `../../../archive/README.md`. V4 is self-contained:

```text
versions/v4-theory/
├── VERSION
├── README.md
├── PLAN.md
├── data/
├── docs/
├── max/
└── python/
```

The mirrored shape is deliberate:

- Python currently finds its data root by walking upward for `PLAN.md`.
- The Max supervisor walks upward for `python/src/main.py`.
- The in-process Max engine resolves data relative to `max/engine/`.
- Python and JavaScript tests derive fixture paths from their own version tree.

V4 transport is isolated from v3:

| Endpoint | V3 | V4 |
|---|---:|---:|
| Python listen | `127.0.0.1:9000` | `127.0.0.1:9100` |
| Max reply | `127.0.0.1:9001` | `127.0.0.1:9101` |

V4 adds a protocol handshake. Python sends `/status/protocol "v4"` on
startup and on every `/control/ping`. The v4 Max bridge reports
`protocolstat v4` to the patch. It caches the Complexity value until the v4
handshake is confirmed, preventing an inherited v3 service from receiving a
control it does not understand.

The established v3 message shapes remain unchanged. In particular:

- `/chord/input` and `/chord/output` still carry one chord string.
- `/phrase/request <key> <bars> [cadence] [seed]` keeps its positional
  layout.
- `/phrase/output` remains alternating chord strings and positive numeric beat
  durations. Integer senders remain valid; v4 scheduling also retains
  fractional durations.
- Existing model indices must not be reordered. New models are appended or
  selected through a separate v4 control.

## Generation pipeline

V3 generators sample an output directly. V4 separates proposal, musical
planning, and realization:

```text
generator candidates
        ↓
key-relative chord/function normalization
        ↓
complexity permission mask
        ↓
phrase-level theory scoring and cadence planning
        ↓
surface realization: quality, extension, alteration, inversion
        ↓
OSC chord symbol
        ↓
Max parser, voice leading, and MIDI
```

The Max realization boundary has two additional invariants:

- every playable chord event contains at least three distinct in-range MIDI
  notes, or it is rejected as an error rather than emitted as a lone pitch;
- one chord-level lifecycle owns those notes. The complete voicing is held until
  the next attack/Stop/Panic, so stale per-note timers cannot remove shared
  tones from a following chord.

Rhythmic placement is a downstream performance layer. **Rhythm** controls
attack density; **Feel** selects Straight, Push, Tresillo, Clave 3-2, Clave
2-3, Upbeats, or Triplet placement. Phrase scheduling may copy the current
full chord to a rhythmic retrigger, but it must never split a harmony into
independently generated note events. The phrase's order, total duration, and
final downbeat cadence remain structural anchors.

A candidate phrase should be scored from explicit terms rather than a single
opaque number:

```text
model log probability
+ functional progression score
+ cadence and phrase-position score
+ parsimonious voice-leading score
- repetition penalty
- distance from requested complexity
```

Hard masks prevent devices above the selected tier. Soft scores choose the most
musical candidate among permitted devices. If every proposal is rejected, the
planner falls back to a valid lower-tier realization rather than returning no
chord or crashing the OSC thread.

## Structured harmonic representation

Opaque chord strings remain the wire format for compatibility, but theory work
should use structured events internally:

```text
ChordEvent
  root pitch class
  scale degree and function
  quality
  extensions and alterations
  inversion or bass pitch class
  duration
  local key
  phrase position
  source model and probability
```

This is necessary for correct transposition of inversions, functional scoring,
and controlled modulation. For example, transposing `C:maj/E` must transpose
both C and E; treating everything after the colon as an opaque quality is not
sufficient.

The backend vocabulary and Max parser must agree. V4 tests enumerate emitted
qualities through backend serialization, OSC, Max parsing, and MIDI voicing.
The implemented v4 bridge preserves a planner-selected seventh, extension,
alteration, or slash bass by default, including at Voicing `0`. Plain-triad
reduction is opt-in through `triadsonly 1`; `triadsonly 0` restores full
parsed harmony. The explicit override persists across later Voicing-dial
changes.

## Model behavior

| Engine | Character | Appropriate v4 role |
|---|---|---|
| First-order Markov | Immediate, corpus-local transitions; transparent but short-memory | Stable compatibility baseline and candidate source |
| RNN | Stateful local continuity with compact recurrent memory | Lightweight neural baseline |
| LSTM | Longer recurrent memory and fewer abrupt context losses than the RNN | Existing neural baseline |
| Variable-order n-gram | Uses the longest supported recent context, orders 1–4, before backing off | Shipped interpretable ii–V–I and turnaround model |
| Phrase engine | Learned harmonic rhythm, strong-beat placement, and sequence-length guarantees | Duration and phrase-shape layer |
| Conditional Transformer | Attends over a phrase, key, position, style, and complexity condition | Long-range candidate generator; target addition |
| Hierarchical function planner | Plans `T → PD → D → T` or a modulation path before choosing symbols | Core v4 theory layer |
| Graph/Tonnetz scorer | Measures common tones, harmonic distance, substitutions, and voice leading | Reranker rather than the first standalone generator |
| Conditional VAE | Continuous interpolation between styles or complexity regions | Optional research model, not required for the initial v4 |

GRU adds a useful efficiency comparison but little new behavior beyond the RNN
family. Diffusion is better reserved for full piano-roll or audio generation;
it is not a priority for chord-symbol planning.

All generators should eventually expose ranked candidates through one adapter.
The planner then applies the same Key, Complexity, Cadence, and validation logic
to Markov, recurrent, Transformer, and phrase paths. A neural proposal API must
not mutate hidden state until the planner commits the selected token.

The implemented v4 Model tab order is
`markov / rnn / lstm / ngram / phrase`. The n-gram is a registry generator;
Phrase is a separate sequence engine using `/phrase/request`.

## Complexity tiers

`/control/complexity` is normalized from `0` to `1`. The backend may tune
the exact dial bands, but the semantic tier order is stable and must be covered
by tests.

| Tier | Harmonic permission | Illustrative realization in C |
|---:|---|---|
| 0 — Basic | Diatonic root-position triads, slow changes, direct tonic–predominant–dominant–tonic motion | `C:maj F:maj G:maj C:maj` |
| 1 — Functional | Diatonic sevenths, inversions, suspensions, cadential 6/4, smoother voice leading | `C:maj7 D:min7 G:7 C:maj7` |
| 2 — Color | Secondary dominants, tonicization, modal borrowing, diminished approaches | `C:maj7 A:7 D:min7 G:7 C:maj7` |
| 3 — Advanced | Ninths through thirteenths, altered dominants, tritone and backdoor substitutions, chromatic mediants | `C:maj9 E:7b9 A:7#9 D:min9 Db:7 C:maj9` |
| 4 — Altered/remote; modulatory target | Altered or remote chromatic harmony now; pivot chords and controlled local-key changes when the hierarchical phrase planner lands | A future phrase plan records each local key and a return or destination cadence |

Increasing Complexity widens the permitted harmonic grammar; it does not
require every chord to be chromatic. A musically coherent level-4 phrase can
contain many simple chords. Distributional tests should therefore compare a
fixed-seed batch's mean or median complexity, not demand that every individual
sample be strictly more complex.

The current `4.0.0-dev` planner implements chord-level classification, masking,
functional/cadential reranking, and surface realization. The bundled n-gram is
trained by `python/scripts/build_theory_ngram.py` from run-length-encoded JazzNet
sequences. Phrase-level modulation is a stated target, not a shipped-model claim.

## Independent controls

| Control | Musical question | Must not be conflated with |
|---|---|---|
| Color | Which corpus/style mixture is emphasized? | Complexity |
| Adventure | How flat or sharp is the sampling distribution? | Harmonic sophistication |
| Spice | Legacy macro over Color and Adventure | A replacement for Complexity |
| Complexity | Which harmonic devices may the planner use? | Randomness |
| Gravity/Cadence | How strongly and when should the phrase resolve? | Style |
| Key | What is the current tonic, mode, and transposition frame? | Absolute corpus pitch |
| Model | Which generator proposes material? | The shared theory policy |
| Session | Is neural history carried between requests? | Phrase duration |

Changing Complexity invalidates prefetched or captured phrase material so the
next phrase reflects the new policy. It should not reset Color, Adventure, Key,
or neural session state unless a documented model limitation requires it.

## V4 OSC additions

| Direction | Address | Payload | Purpose |
|---|---|---|---|
| Max → Python | `/control/complexity` | float `0..1` | Simple-to-advanced theory policy |
| Python → Max | `/status/protocol` | string `"v4"` | Confirm the isolated v4 backend |
| Node → patch | `protocolstat` | `v4`, `legacy`, or another observed version | Visible compatibility state |

The v4 Max bridge uses the UI short name `Complex` and long name
`Complexity`. It initializes the control at `0.5`, the compatibility tier that
preserves existing model symbols. Valid values are cached until the protocol
handshake succeeds.

## Dataset strategy

The existing compact runtime artifacts remain available so v4 can reproduce
v3 behavior. Their technical provenance and unresolved license review are
recorded in `../data/dataset_provenance.json`.

Recommended additions are staged by purpose:

| Need | Candidate | Use |
|---|---|---|
| Broad standardized chord data | ChoCo | Pretraining, key-relative sequences, style and modulation conditions |
| Explicit functional labels | DCML corpora | Roman numerals, cadence, tonicization, modulation planner |
| Jazz phrase detail | JAAH | Extensions, substitutions, harmonic rhythm, jazz evaluation |
| Classical phrase detail | Haydn Op. 20 annotations | Cadences, inversions, voice leading, modulation evaluation |
| Additional MTG resources | MTG dataset catalog and mirdata-compatible collections | Key, structure, alignment, or repertoire-specific evaluation |

Raw third-party corpora do not belong in Git by default. Use download scripts
and record:

1. source URL or DOI and exact release;
2. per-partition license and attribution;
3. redistribution permission for raw and derived data;
4. cryptographic checksum;
5. preprocessing command and code revision;
6. composition-level train, validation, and test split;
7. whether referenced audio is separately restricted.

No license should be inferred from a hosting platform, a paper, or a dataset
catalog entry. When a corpus contains partitions with different terms, preserve
those boundaries through preprocessing.

## Verification requirements

A v4 release candidate is complete only when:

- the root v3 suites still pass without tracked v3 changes;
- the archive checksum and ZIP integrity pass;
- v4 Python and Max suites run from their own version directories;
- v3 and v4 services can run concurrently on their separate port pairs;
- the protocol handshake prevents accidental adoption of v3;
- complexity rules pass structural and distributional tests in major and minor
  keys;
- every generated symbol is transposable, serializable, parseable, and
  sonifiable;
- malformed OSC values produce an error without killing the service;
- `/phrase/request` and `/phrase/output` remain wire-compatible;
- model failure rolls back to a working engine and a legal chord;
- dataset provenance and license review are updated for every new artifact.

See `../README.md` for the exact launch and test commands.
