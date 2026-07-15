# Chord Markov Max Device (protocol v3) — triad sonification

Standalone Max/MSP patch that sends chord symbols to the Python Markov OSC
service, **displays the sampled reply, parses it into MIDI, and plays it** as a
**major or minor triad** through an Ableton instrument placed after the device.

Uses **Node for Max** (`node.script` + `node-osc`) — **CNMAT externals are not required**.

## Protocol-v4 Performer in this folder

For the isolated theory prototype, use `Chord Markov Performer v4.amxd` with
`markov_osc_v4.js` and the v4 Python service on ports `9100/9101`. Unlike the
inherited v3 devices documented below, it preserves the complete emitted chord
by default and holds all voices until the next chord/Stop/Panic. Independent
`makenote` timers were removed from this v4 patch because delayed note-offs
could strip shared tones from the following voicing.

Its **Voices** readout exposes the outgoing count (normally 3 or more), and its
new **Feel** tab offers Straight, Push, Tresillo, Clave 3-2, Clave 2-3, Upbeats,
and Triplet placement. Rhythm controls density; Feel controls placement. Both
now affect the default Phrase engine, while the inherited binary Triplet
parameter remains hidden and compatible with saved automation.

The remainder of this file describes the inherited v3/shared devices unless a
section explicitly names v4.

## Signal flow

```
user enters chord → Max → Node → Python(Markov) → returns chord symbol
  → Node displays it, parses it, voices it as a MAJOR/MINOR TRIAD
  → Node emits a MIDI note list → makenote → flush → midiformat → midiout
  → Ableton instrument after the device makes sound
```

**Project constraint:** only **major or minor triads** are sonified. The parser
still fully understands the returned symbol (`Cmaj7`, `E:hdim7`, `Dm7b5`, …) and
`chord` still shows that full symbol; the `notes` are the reduced triad. The
third decides quality (major 3rd → major triad, minor 3rd → minor triad, no
third → major). Toggle with the **triads only** switch in the patch.

## Requirements

- Max 8+ with Node for Max (included in standard Max 8 installs)
- A Python with `python-osc` installed (the performer device finds and starts
  it by itself — see "Self-launching backend" below; older devices need a
  manual terminal launch)
- One-time npm install from inside the patch (see Quick start)

## Self-launching backend (Chord Markov Performer)

The **Performer** device starts and supervises the Python service itself —
no terminal needed. On load, `backend_supervisor.js`:

1. checks UDP **9000**: if a backend is already serving (a terminal launch, a
   previous crash's survivor, another copy), it **adopts** it instead of
   fighting it;
2. otherwise finds a Python by probing absolute paths in order —
   `backend_config.json` → `$CHORD_PYTHON` → repo `.venv` →
   `/opt/anaconda3/bin/python3` → Homebrew → `/usr/bin/python3` — accepting
   the first with `python-osc` (and preferring one that also has `torch`);
3. launches `python -m src.main`, reads the service's own
   `sent /status/ready` log line as the readiness signal, then heartbeats it
   and **auto-restarts** on crashes (3 attempts, backoff; a backend that ran
   ≥30 s earns a fresh attempt budget);
4. kills the managed Python when the device closes; if Max/Live dies so hard
   that even that is skipped, the service notices it was orphaned
   (`CHORD_SUPERVISED=1` watchdog) and exits by itself.

The panel shows a **light** (green = answering, amber = starting/linking,
red = down), a text readout (`up (managed)`, `up (external)`, `restarting
1/3`, `need python-osc`, …) and a **Relink** button that restarts the engine
with a fresh attempt budget. An adopted backend shows amber `linking...`
until it actually answers — a hung process never flashes green.

To pin a specific interpreter or project location, drop a
`max/backend_config.json`:

```json
{ "python": "/opt/anaconda3/bin/python3", "pythonDir": "/path/to/repo/python" }
```

Manual launches still work exactly as before — a running
`python -m src.main` is simply adopted, and the supervisor never kills a
process it didn't start.

## Quick start

### 1. Start Python (older devices only — the Performer starts it itself)

From the repo root:

```bash
cd python
python3 -m pip install -r requirements.txt
python3 -m src.main
```

### 2. Open the patch

Open `chord_markov_device.maxpat` in Max.

### 3. Install npm dependencies (first time only)

Click **npm install** in the patch. Wait until the Max console shows npm finished (may take ~30 seconds).

Alternatively, from a terminal:

```bash
cd max
npm install
```

### 4. Ping and send

1. Click **ping** — status should show `ready` when Python replies.
2. Enter a chord (e.g. `G:7`) in the text box and press **Enter** (or click **send**).
3. The sampled next chord appears in **output** and **predicted chord**, the
   voiced triad appears in **MIDI notes**, and the chord plays through the
   instrument after this device.

Click **reload** to reload the CSV without restarting Python.

### 5. Test the parser without Python

The **TEST PARSER** section (message boxes `testparse Cmaj7`, `testparse Dm7`,
`testparse N.C.`, and a text box) parses, voices, and plays a chord **directly**,
bypassing the Markov/Python path — useful for checking MIDI output on its own.
This never replaces the real Markov path.

## Chord parsing (`chord_parser.js`)

A dependency-free module (also runnable under plain `node`). It normalizes the
symbol (`♭`→`b`, `♯`→`#`, strips quotes/whitespace/newlines), parses the root +
quality (jazz notation *and* colon-dataset notation `C:maj7`), builds pitch
classes from interval patterns, and voices the chord.

- **Voicing:** close-position triad in the C3–C5 register; a slash bass (e.g.
  `Cmaj7/G`) is placed one octave below the triad.
- **Voice leading:** an optional nearest-voicing mode keeps successive triads
  close together (deterministic, register-bounded).
- **No chord:** `N.C.` / `NC` / `no_chord` → silence (emits `stop`, no notes).
- **Errors:** unknown symbols emit `error <code> <symbol>` and **no** MIDI.

Run the full test matrix: `npm test` (from this folder) — bridge (parser,
performance map, supervisor), engine (the ported corpus/neural/phrase modules),
and the two Python-free device end-to-end runs (`test:device`, `test:fallback`).
See [../ONNX_DEVICE.md](../ONNX_DEVICE.md) for the in-process ONNX devices, their
`build_onnx_patches.py` generator, and the `no_onnx.js` fallback harness.

## Default ports

| Role | Host | Port |
|---|---|---|
| Python listen | `127.0.0.1` | `9000` |
| Max listen | `127.0.0.1` | `9001` |

Ports are set in `markov_osc.js`. Change them there if you use non-default Python ports.

## Controls

| UI | Action |
|---|---|
| **npm install** | Runs `script npm install` to fetch `node-osc` (first time only) |
| **ping** | Sends `/control/ping` |
| **send** / **Enter** | Sends `/chord/input` with the text field value |
| **reload** | Sends `/control/reload` |
| status | Shows `ready` or `waiting` |
| output | Last `/chord/output` chord symbol (raw, for the rest of the system) |
| predicted chord | Normalized returned symbol (e.g. `Cmaj7`) |
| MIDI notes | Voiced triad note list (e.g. `48 52 55`) |
| velocity / duration ms | `makenote` note velocity (default 90) and length (default 1000 ms) |
| register center | Voicing register centre sent to Node (default 60 ≈ C4) |
| voice leading | Nearest-voicing on/off (default ON in Node) |
| triads only | Reduce to major/minor triad on/off (default ON in Node) |
| panic | All notes off |

## Node → Max message protocol

`markov_osc.js` emits these to the `route` object (backward-compatible):

| Message | Meaning |
|---|---|
| `status <word>` | `ready` / `waiting` |
| `output <symbol>` | raw Markov reply (unchanged — feeds `out s`) |
| `error <code> [detail]` | passthrough / parser error (e.g. `error unsupported_modifier C7add#15`) |
| `chord <symbol>` | normalized returned symbol for display |
| `notes <midi ...>` | playable triad MIDI note list |
| `stop` | silence held notes (N.C. / panic) |

The Node→Max message protocol (`status/output/error/chord/notes/stop`) is
unchanged; the OSC contract to/from Python is **v3** (adds `/control/model`,
`/control/session`, `/control/gravity`, and `/phrase/request`). See
[../docs/osc_contract.md](../docs/osc_contract.md).

## Sequencer device (`Chord Markov Sequencer.amxd`)

A separate device with a **usable Max for Live presentation UI** that **plays
along the Markov chain automatically** for a set length, using harmonic-rhythm
templates.

How it works: each chord slot plays the current chord (as a triad) and feeds it
back into `/chord/input`; the Markov reply becomes the **next** slot's chord
(output → input). The device runs on **its own quarter-note clock** — an
ms-based `metro` driven by the **tempo (BPM)** control — so it plays as soon as
you press **PLAY**, with **no need to start Live's transport**. Chords change at
the template's slot onsets and sustain until the next; after the set number of
bars it stops and flushes all notes.

**Presentation controls:** `seed` chord + **send**, **PLAY** toggle, a
performable **Rhythm** `live.dial`, **tempo (BPM)** (default 120), **length**
(bars, default 4), three **colour** `live.dial`s, a **sync** toggle, plus
`chord` / `notes` / `status` displays.

**Performable dials** (`live.dial`s — registered parameters, so you can map them
to rack **macros**):

| Dial | Effect |
|---|---|
| **Rhythm** | 0–100 % sweeps harmonic-rhythm **density** through the templates below, sparse→dense (one chord / two bars → a chord every beat). Changes land on the next bar downbeat while playing; the current template name shows next to the dial. Default ≈ `half_half`. |
| **Major** | per-chord chance of forcing a **major** triad |
| **Minor** | per-chord chance of forcing a **minor** triad (Major wins ties) |
| **7th** | per-chord chance of adding a **flat-7th** (major→dom7, minor→min7) |

All three at 0 = the natural major/minor triad. The colour is applied to the
Markov-returned chord in Node (`colormajor` / `colorminor` / `color7th`
messages), so it works in real time as you turn the knobs.

**Sync toggle:** off (default) = free-running ms clock at the **BPM** knob; on =
the clock **links to Live's global transport** (a transport-locked `metro 4n`
that follows Live's tempo and plays only while the transport is running).

**Harmonic-rhythm templates** (slot onsets in beats, 4/4):

| # | name | span | chords change on beats |
|---|---|---|---|
| 1 | whole_bar | 1 bar | 0 |
| 2 | half_half | 1 bar | 0, 2 |
| 3 | four_quarters | 1 bar | 0, 1, 2, 3 |
| 4 | half_qtr_qtr | 1 bar | 0, 2, 3 |
| 5 | qtr_qtr_half | 1 bar | 0, 1, 2 |
| 6 | qtr_half_qtr | 1 bar | 0, 1, 3 |
| 7 | static_2bar | 2 bars | 0 |

**Use:** start Python; add the device to a MIDI track with an instrument after
it; type a seed chord + **send**; set the **Rhythm** dial, **tempo**, and
**length**; press **PLAY** (Live's transport does not need to be running).
Sweep the **Rhythm** and **colour** dials while it plays — or map them to
macros — to perform the harmony.

> Python must be running for the chain to advance. Without it, PLAY still runs
> the clock but the seed chord simply repeats at the chosen rhythm.

Node messages in: `play 1|0`, `beat` (quarter-note clock), `rhythm <0-1>`,
`template <1-7>`, `length <bars>`, `seed <chord>`, `colormajor/colorminor/color7th <0-1>`.
Spice/performance (see below): `color/adventure/spice/voicing/voicedistance <0-1>`,
`phraselen <0-1>`, `phrasemode loop|regen|oneshot`, `reroll`, `hold 0|1`,
`key <sym>`, `keyroot <0-11>`, `keymode maj|min`, `pgm <n>`, `cc <n> <v>`.
Node messages out: `playoff` (clock done), `rhythmname <name>` (current template),
`phraselenbars <n>`, `phrasemodename <name>`, `voicedistname <name>`, `keyname <sym>`.

## Spice device (`Chord Markov Sequencer (Spice).amxd`)

A **versioned copy** of the sequencer (`chord_markov_sequencer_spice.maxpat`)
that adds a **corpus-blend** section. The base `Chord Markov Sequencer` is left
unchanged; both devices share `markov_osc.js`.

### Compact performer panel (fits the Live device area)

The device opens in **Presentation mode** as one **764×310** panel — sized to sit
in Ableton's device chain — with every control visible in two columns:

```
LEFT   SELECT   Seed▾ · Key▾(+min) · Model▾   (list dials + readouts) · audition
       PHRASE   PhraseLen(→bars) · loop/regen/oneshot(→mode) · reroll · hold
RIGHT  TRANSPORT play · BPM · sync · bars
       HARMONY   Color · Adventure · Spice · Rhythm (→rhythm readout)
       VOICING   Voicing · VoiceDist(→voice) · Major · Minor · Seventh
BOTTOM OUTPUT    chord · notes · status
```

**Seed, Key and Model are picked from lists — no typing.** Each is a `live.dial`
that scrolls a fixed list (so it is MPK-knob-mappable), and its choice shows in a
readout beside it:

| Control | Message | List |
|---|---|---|
| **Seed** dial | `seedsel 0–1` | 16 common chords (`C:maj`…`B:hdim7`); `audition` button previews it |
| **Key** dial + **min** toggle | `keysel 0–1`, `keymin 0\|1` | 12 chromatic roots × maj/min → sets `/control/key` |
| **Model** dial | `modelsel 0–1` | `markov` (corpus blend) · `rnn` · `lstm` (JazzNet neural) — all live once weights are fetched |

Lists live in `performance_map.js` (`SEED_LIST`, `KEY_ROOTS`, `MODEL_LIST`);
readouts are fed by the extended `route` object (`seedname`/`keyname`/`modelname`).

Every performable value has a live **readout** next to it — the node bridge emits
`phraselenbars / phrasemodename / voicedistname / keyname / seedname / modelname`,
and the patch's `route` object forwards them to display boxes (so PhraseLen shows
`16`, Seed shows `C:maj`, etc.). The whole layout is generated from a single
`LAYOUT` table in `build_spice_patch.py`; re-running it re-lays-out the panel and
re-sizes the window. `build_amxd.js` honours the patch's own window size.

> **Not seeing the controls?** Ableton caches an `.amxd` when you add it and does
> not reload after a rebuild — **delete the device from the track and drag the
> fresh one back in**. In the Max editor, switch to **Presentation** (View →
> Presentation); the dials only arrange as the panel there.

Where the **colour** dials (Major/Minor/7th) recolour the sonified triad
*after* a chord is chosen, the **Spice** dials act **upstream** — they change
**which chord the Markov chain picks** by blending the per-corpus chains
(POP909 pop, Nottingham folk, Bach classical, OpenBook jazz) in Python and
tempering the result. Requires `data/markov_corpora_t.json` (built by
`python/scripts/build_bach_markov.py`); without it the service falls back to the
single openbook chain.

| Dial / field | Message | Effect |
|---|---|---|
| **Color** | `color <0-1>` | Morph corpus flavour: `0` folk → pop → classical → `1` jazz |
| **Adventure** | `adventure <0-1>` | Temperature: low = safe/common chord, high = rarer, more surprising chords surface |
| **Spice** | `spice <0-1>` | Macro — drives Color **and** Adventure together (one-knob "spiciness") |
| **Key** | `key <sym>` | Current song key (`C:maj` / `A:min`), so the blend transposes to/from it (default `C:maj`) |

All are registered `live.dial` parameters (map them to rack macros). The Spice
dials are performable in real time, exactly like Rhythm/colour.

> **To hear the added colour:** the blend changes the returned chord *symbol*
> (e.g. `Cmaj7`, `Db:7`), but sonification still reduces to a major/minor triad
> while **triads only** is ON (project default). Toggle **triads only** OFF to
> voice the full extensions.

Regenerate after editing: `python3 build_spice_patch.py` (rebuilds the patch
from the base sequencer), then
`node build_amxd.js chord_markov_sequencer_spice.maxpat "Chord Markov Sequencer (Spice).amxd"`.

### Performable phrases (2–16 bars)

The Spice device turns the continuous walk into **repeatable N-bar phrases** you
can perform. New controls (all on `markov_osc.js`, mapped in `performance_map.js`):

| Control | Message | Effect |
|---|---|---|
| **Phrase Length** dial | `phraselen 0–1` | Stepped **2 / 4 / 8 / 16** bars (the performer's Bars tab picks the same list) |
| **Phrase Mode** (loop/regen/oneshot msgs) | `phrasemode loop\|regen\|oneshot` | **loop** = capture the phrase, repeat verbatim; **regen** = a fresh phrase each cycle; **oneshot** = play once, stop. Default **loop** (set by loadbang). |
| **Reroll** | `reroll` | Discard the phrase, walk a fresh one from the seed |
| **Hold** toggle | `hold 0\|1` | Vamp — freeze on the current chord |
| **Voicing** dial | `voicing 0–1` | Functional ladder: root triads → inversions (voice-leading) → diatonic 7ths → open/drop-2 + 9/13 extensions. Master over `triadsonly`. |
| **Voice Distance** dial | `voicedistance 0–1` | Off + the 8 Harmony-Singer-2 positions — adds a **diatonic** harmony voice above/below the chord's top note (3rd/5th above, 4th/6th below, and combos), snapped to the current **Key**. |

LOOP is deterministic: the captured phrase replays with **no** OSC round-trip, so
the loop is tight. A length/rhythm/mode change re-captures on the next cycle.

### MPK Mini Plus setup

One `midiin → midiparse` feeds three roles, so pads never collide with the keys:

- **Keys** → `notein` → seed the chain (play in any key).
- **Pads** → set to **Program Change** in the MPK editor → `pgm` actions:

  | PC | Action | PC | Action |
  |---|---|---|---|
  | 0 | Play/Stop | 4–7 | Length 2/4/8/16 |
  | 1 | Reroll | 16–27 | Set tonic C…B |
  | 2 | Hold | 28 / 29 | Key mode maj / min |
  | 3 | Cycle Phrase Mode | | |

- **Joystick mod (CC 1)** → `cc` → **Adventure** swells.
- **8 knobs** → MIDI-map in Live to the params. Recommended: **Color, Adventure,
  Rhythm, Phrase Length, Voicing, Voice Distance, Spice, Major**. All 10 params are
  mappable; Live's macro strip shows the first 8 (bank0).

To change the PC/CC map, edit `decodePgm` / `CC_MAP` in `performance_map.js`
(unit-tested in `performance_map.test.js`) — no patch edits needed.

## MIDI input from Ableton

The device also listens to the track's incoming MIDI. Play a note (keyboard or
clip) and it **seeds the Markov chain**: the note's pitch class becomes a
major-triad root symbol (e.g. C4 → `C:maj`, F#3 → `F#:maj`), which is sent to
Python exactly like a typed chord — so the sonified triad is the chord the
Markov system returns, not the raw note. Note-offs are ignored.

Chain: `midiin → midiparse → unpack → stripnote → gate → prepend notein → node`.
The **enable MIDI in** toggle (on by default) gates it; a M4L MIDI effect does
not pass raw MIDI through, so played notes are replaced by the generated triad.

## Max for Live device (`.amxd`)

`Chord Markov Device.amxd` is the same patch wrapped as a **Max MIDI Effect**
(device type `mmmm`) — drop it on a MIDI track **before an instrument** and the
generated triads play through that instrument.

**Important — keep the device next to its scripts.** The device loads
`markov_osc.js` (which requires `chord_parser.js` and `node_modules/node-osc`)
by relative path, so the `.amxd` must live in **this `max/` folder** with those
files. Two ways to deploy:

1. **In place (dev):** in Max, *Options → File Preferences* → add this `max/`
   folder to the search path, then drag `Chord Markov Device.amxd` onto a MIDI
   track. First run: click **npm install**, then **ping**.
2. **Frozen (portable):** open the device in the Max editor and click the
   **freeze** (snowflake) button. Freezing embeds `markov_osc.js`,
   `chord_parser.js` and `node_modules` into the `.amxd` so it can be moved
   anywhere. (Freezing must be done from Max — it can't be scripted.)

Regenerate the `.amxd` after editing the patch:

```bash
node build_amxd.js   # wraps chord_markov_device.maxpat -> Chord Markov Device.amxd
```

## Files in this folder

| File | Purpose |
|---|---|
| `Chord Markov Device.amxd` | Max for Live MIDI-Effect device (wraps the patch) |
| `chord_markov_device.maxpat` | Max UI: OSC bridge + displays + MIDI branch |
| `markov_osc.js` | Node-for-Max OSC client/server + voicing/sonification glue |
| `chord_parser.js` | Pure-JS chord symbol parser + voicing engine (inversions, drop-2, diatonic added-harmony) |
| `chord_parser.test.js` | Parser/voicing test suite (`npm test`) |
| `performance_map.js` | Pure dial/pad mapping tables (phrase length, modes, PC/CC map, voicing bands, voice-distance) |
| `performance_map.test.js` | Mapping tests (`node performance_map.test.js`) |
| `backend_supervisor.js` | Self-launching Python backend: interpreter discovery, adopt-or-spawn, heartbeat, auto-restart, kill-on-close |
| `backend_supervisor.test.js` | Supervisor decision-logic tests (`node backend_supervisor.test.js`) |
| `build_amxd.js` | Wraps the `.maxpat` into the `.amxd` device (arg 3 = device type) |
| `build_spice_patch.py` | Generates `chord_markov_sequencer_spice.maxpat` from the base sequencer (idempotent) |
| `package.json` | npm dependency on `node-osc`; `test` script |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `node-osc missing` error | Click **npm install** and wait for it to finish |
| Status stays `waiting` | Performer: check the backend light/readout and click **Relink**. Older devices: start Python manually (`python3 -m src.main` from `python/`) |
| Backend readout `run npm install` | The bridge itself can't run yet — click **npm install** (first time only), then **ping** |
| Backend readout `need python-osc` | No interpreter with `python-osc` was found — `pip install python-osc` into your Python, or pin one in `max/backend_config.json` / `$CHORD_PYTHON` |
| Backend readout `up (external)` | A backend you (or a previous session) started is being reused — that's by design; quit it if you want the device to own a fresh one |
| Backend readout `not responding` | Something is bound to port 9000 but not answering — quit/kill that process, then click **Relink** |
| Backend readout `remove 2nd copy` | Two copies of the device in one Set both need ports 9000/9001 — only one can talk to the backend; remove one and reload |
| `reply timeout` | Python not running, wrong port, or firewall blocking localhost UDP |
| `node.script` errors on load | Confirm Node for Max is enabled in Max 8 |

Run the Python smoke test without Max:

```bash
cd python
python3 scripts/osc_smoke_test.py --spawn-service
```

## OSC addresses

See [PLAN.md](../PLAN.md) and [docs/osc_contract.md](../docs/osc_contract.md).
