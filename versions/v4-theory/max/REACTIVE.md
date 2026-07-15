# Audio / MIDI reactivity (reactive build)

Makes the Markov chord engine **respond to a live performer** — extracting
features from audio (loudness, brightness, pitch, onset density) and MIDI
(velocity, mod wheel, pitchbend) and using them to drive the patch's behavior in
real time. All controls still flow through the existing
`[prepend <command>] → node.script markov_osc.js` bus, so **no `markov_osc.js`
change was required** — the reactive layer just feeds the handlers that the
`Rhythm`/`Major`/`Minor`/`7th` dials already drive.

**Versioning:** every original patch/device is untouched. All new work lives in
`_reactive` copies and one new analyzer device.

## New files

| File | Type | What it adds |
|---|---|---|
| `chord_markov_sequencer_reactive.maxpat` | standalone / MIDI-fx | Full audio analysis (`adc~`) + gated mapping + Live `---bus` receive bridge |
| `chord_markov_device_reactive.maxpat` | MIDI-fx | MIDI velocity/CC/pitchbend expression mapping |
| `chord_markov_audio_analyzer.maxpat` | Audio-fx | `plugin~` passthrough + analysis, publishes features on the global `---bus` |
| `Chord Markov Sequencer (Reactive).amxd` | `mmmm` | built device |
| `Chord Markov Device (Reactive).amxd` | `mmmm` | built device |
| `Chord Markov Audio Analyzer.amxd` | `aaaa` | built device |

## Mappings

**Sequencer (audio):** an `AUDIO drive` toggle opens gates so audio can drive the
mapping (off = the hand dials drive, unchanged). An `AUDIO SRC` toggle picks the
feature source: **off = `adc~`** (standalone), **on = `---bus`** (Live analyzer).

| Feature | → target (existing handler) |
|---|---|
| brightness (`zerox~` proxy) | `colormajor` / `1−bright → colorminor` |
| loudness (`peakamp~`) | `register` (throttled `qlim 200`) + output note velocity (`makenote`) |
| onset density (inter-onset `timer`) | `rhythm` (throttled `qlim 250`) |
| pitch at onset (`fzero~` → `snapshot~` → `ftom`, held by `f` and banged at `edge~` onset) | `notein` seed (onset-gated + `speedlim 150`) |

**Device (MIDI):**

| MIDI feature | → target |
|---|---|
| note velocity (`stripnote` R outlet) | output note velocity (dynamics) **and** `color7th` (tension) |
| mod wheel `ctlin 1` | `register` (`qlim 100`) |
| pitchbend `bendin` | `colormajor` / `1−bend → colorminor` (`qlim 50`) |

> Rhythm/harmonic-density is an auto-player (sequencer) concept, so it is **not**
> mapped in the single-shot device.

## The `---bus` contract (analyzer → sequencer)

`---` prefixed send/receive names are **global across the whole Live set** in M4L.

| Address | Payload | Meaning |
|---|---|---|
| `send/receive ---loud` | float 0..1 | loudness |
| `send/receive ---bright` | float 0..1 | brightness (zero-crossing proxy) |
| `send/receive ---dens` | float 0..1 | onset density |
| `send/receive ---pitch` | float (MIDI) | pitch, emitted only at note onsets |

## Build & deploy

Rebuild any device after editing its `.maxpat` (leave the original build targets
alone):

```bash
node build_amxd.js chord_markov_audio_analyzer.maxpat   "Chord Markov Audio Analyzer.amxd"      aaaa
node build_amxd.js chord_markov_device_reactive.maxpat  "Chord Markov Device (Reactive).amxd"
node build_amxd.js chord_markov_sequencer_reactive.maxpat "Chord Markov Sequencer (Reactive).amxd"
```

`build_amxd.js` now takes an optional 3rd arg for device type (`mmmm` default,
`aaaa` audio, `iiii` instrument). Then **freeze** each device in the Max editor
(snowflake button) to embed the JS/`node_modules` — freezing can't be scripted.

**Live two-device setup:** analyzer (`aaaa`) on an **audio track**; the reactive
sequencer (`mmmm`) on a **MIDI track** with an instrument after it. Set the
sequencer's `AUDIO SRC` toggle to **on (`---bus`)**. The analyzer's features now
drive the harmony while its track audio passes through untouched.

## Verify in Max (these use objects I could not test here — calibrate with the monitors)

Each analysis chain has a **flonum monitor** — watch it while you play and
**tune the `scale` ranges** to your input/room. Specific things to confirm:

1. **Pitch = `fzero~` (stock), sampled at onset.** `sigmund~` is a 3rd-party
   external and is **not installed here**, so pitch uses `fzero~ → snapshot~ 50 →
   ftom`, held by an `[f]` that is banged by `edge~` at each note onset (`>~ 0.04`
   threshold). Verify the pitch monitor jumps on played/sung notes; raise the
   `>~ 0.04` threshold if it retriggers on room noise.
2. **`zerox~` brightness range** — `scale 0. 24. 0. 1.` assumes ~0–24 zero-crossings
   per signal vector. Watch the brightness monitor and adjust the input-high value
   so bright material reads near 1.0. (For a true spectral centroid, drop in
   `zsa.centroid~` or `fluid.spectralshape~` and rescale from Hz via `ftom`.)
3. **`adc~` needs DSP on** (speaker icon) in the standalone sequencer. In Live use
   the analyzer + `---bus` instead (that's what `AUDIO SRC = on` selects).
4. **No console spam / no `reply timeout`** while features stream — the `qlim`/
   `speedlim`/onset-gating should keep OSC seed submissions discrete.
5. **Handlers respond without audio:** send literal messages (`colormajor 0.8`,
   `register 55`, `notein 60`) into `node.script` and watch the `Max.post` logs.
