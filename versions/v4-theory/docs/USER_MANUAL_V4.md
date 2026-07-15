# Chord Markov Performer v4

## User Manual

**For Ableton Live and Max for Live**

Version 4.0.0-dev  
Manual revision: 13 July 2026  
Applies to: **max/Chord Markov Performer v4.amxd**

> IMPORTANT — USE THE FRESH V4 DEVICE
>
> Remove every previously loaded copy of Chord Markov Performer v4 from the Live Set, then drag the exact AMXD named above into the Set again. Ableton can keep an older embedded device alive after the file on disk has been rebuilt. Only one v4 instance may be loaded because it owns the fixed local reply port 9101.

This manual explains the current v4 device, including the repaired full-chord MIDI path, theory-aware Complexity control, five generators, seven rhythmic feels, self-launching Python backend, and the status displays used to diagnose problems. It does not describe the older v3 devices.

<!-- PAGE BREAK -->

# Contents

1. What the device does
2. Five-minute first sound
3. Installation and daily setup
4. Reading the panel
5. Every control and display
6. What each model changes
7. Moving from simple to complex harmony
8. Rhythm and Feel
9. Practical sound recipes
10. Performance workflow
11. MIDI controller use
12. Troubleshooting
13. Chord-symbol and theory glossary
14. One-page operating checklist

<!-- PAGE BREAK -->

# 1. What the device does

Chord Markov Performer v4 is a **MIDI effect and chord generator**. It does not make audio by itself. It chooses a chord, converts that chord into several MIDI notes, and sends those notes to the Ableton instrument immediately after it.

The musical signal path is:

**Model proposes harmony → Key/Cadence/Complexity shape it → Voicing arranges it → Rhythm/Feel schedule it → MIDI instrument makes sound**

The current v4 build treats every harmony as one chord-level event. Before a new chord attacks, the device releases the complete previous voicing, refreshes its velocity, and sends every pitch in the new voicing together. Those pitches remain held until the next chord, Stop, or an explicit silence event. Normal playable output contains at least three distinct MIDI pitches.

## What it is not

- It is not an audio instrument. Put a polyphonic instrument after it.
- It is not a melody generator. Rhythm controls full-chord attacks and retriggers.
- Complexity is not a randomness knob.
- Voicing is not the same as harmonic Complexity.
- Phrase is a sequence engine, not a fifth single-step predictor.
- The current prototype does not yet include a trained Transformer or a full modulation planner.

## The four controls people most often confuse

| Control | The question it answers | What you hear |
|---|---|---|
| **Complexity** | Which harmonic devices may be used? | Triads, sevenths, borrowing, extensions, altered dominants, substitutions |
| **Spice** | Which style region and how predictable should sampling be? | Folk-to-jazz corpus movement in Markov; safer-to-wilder choices in neural and n-gram models; no effect in Phrase |
| **Cadence** | How strongly should the progression return home? | More tonic/dominant pull and a greater chance of a V–I ending |
| **Voicing** | How should the chosen chord be arranged in MIDI? | Root position, smoother inversions, wider/drop-2 spacing, and optional upper tensions |

<!-- PAGE BREAK -->

# 2. Five-minute first sound

Follow this once before experimenting.

1. In Ableton Live, create a **MIDI track**.
2. Remove every older instance of Chord Markov Performer v4 from the Set.
3. Drag **versions/v4-theory/max/Chord Markov Performer v4.amxd** onto the MIDI track.
4. Place a **polyphonic** Ableton instrument after it. A piano or pad is the easiest test.
5. Make sure there is only one v4 Performer in the Set.
6. Wait for the backend light to turn green and for its text to say **up (managed)** or **up (external)**.
7. Confirm the small protocol display says **v4** rather than **v?** or **legacy**.
8. Choose these safe starting settings:

| Control | Starting value |
|---|---|
| Model | Phrase |
| Bars | 4 |
| Mode | Loop |
| Seed / Key | C:maj / C, maj |
| Cadence | about 85% |
| Complexity | about 30% |
| Spice | 0% (Phrase does not use it) |
| Rhythm | about 33% |
| Voicing | about 25% |
| Feel | Straight |
| Sync | Free |
| BPM | 120 |

9. Click **Play** on the device. Live’s main transport does not need to run while Sync says Free.
10. Watch the bottom chord display and the **Voices** number.

You should see a chord symbol and **Voices 3 or greater**, and the instrument should sound a chord. Click **Stop** on the device when finished.

> If Voices is 3 or greater but you hear one pitch, the generator is sending a chord. Set the following instrument to polyphonic mode, turn off mono/legato, and temporarily remove any arpeggiator. If the first chord sounds correctly and later chords collapse, remove the device and load the exact fresh v4 AMXD again.

## The first useful experiment

Keep everything else fixed and move only **Complexity**:

1. Set it near 10% and listen for plain diatonic triads.
2. Move it near 30% and listen for sevenths and inversions.
3. Move it to 50% and listen for the model’s learned chord qualities.
4. Move it near 70% and listen for ninths, elevenths, thirteenths, and richer dominant colors.
5. Move it near 90% and listen for altered dominants and more remote chromatic color.

The current phrase is allowed to finish cleanly. The next generated or recaptured phrase reflects the new setting.

<!-- PAGE BREAK -->

# 3. Installation and daily setup

## Files that must stay together

The AMXD is not self-contained. Keep the complete **versions/v4-theory** folder together because the device resolves:

- **max/markov_osc_v4.js** and its helper JavaScript files;
- **max/node_modules** for local OSC;
- **python/src** for the backend;
- **data** for transition tables, phrase and n-gram models, JazzNet vocabulary, and RNN/LSTM checkpoints.

Do not distribute or move only the AMXD and expect the backend to follow it.

## One-time dependency setup

The v4 folder normally already contains what this prototype needs. If the panel reports **run npm install** or **need python-osc**, run:

    cd /Users/zacharyscheffler/Desktop/FinalMaxUPF/versions/v4-theory/max
    npm install

    cd /Users/zacharyscheffler/Desktop/FinalMaxUPF/versions/v4-theory/python
    python3 -m pip install -r requirements.txt

Python’s **torch** package is required only for the RNN and LSTM choices. Markov, n-gram, and Phrase can still be used when the backend says **up (no torch)**.

## Normal daily startup

1. Open Live.
2. Load one fresh v4 AMXD before a polyphonic instrument.
3. Wait for the green backend light and protocol v4.
4. Select a model and musical settings.
5. Click the device’s Play button.

The device normally finds a suitable Python interpreter, launches the v4 service, monitors it, and restarts it after a crash. No terminal is needed in normal use.

## Manual backend launch

Use this only when the automatic supervisor cannot find Python or when diagnosing the service:

    cd /Users/zacharyscheffler/Desktop/FinalMaxUPF/versions/v4-theory/python
    python3 -m src.main --port 9100 --max-port 9101

Reload or Relink the device after the service starts. The panel should report **up (external)** because the device adopted a service it did not launch.

## Device order in the Live track

Use this order:

**Chord Markov Performer v4 → optional MIDI processing → polyphonic instrument → audio effects**

For the clearest test, remove optional MIDI processing until the device is confirmed working. An arpeggiator intentionally turns a chord into sequential notes and can make correct chord output sound monophonic.

## Free clock versus Live Sync

- **Free**: the device runs from its own BPM value and can play while Live’s transport is stopped.
- **Sync**: the device follows Live’s tempo and transport. Live must be running before chord ticks occur.

The BPM box affects only Free mode.

<!-- PAGE BREAK -->

# 4. Reading the panel

The compact panel is arranged left to right:

| Panel zone | Controls | Main purpose |
|---|---|---|
| **Transport** | Play, Reroll, Hold, Free/Sync, BPM, Voices | Start, stop, freeze, and monitor playback |
| **Model** | Markov, RNN, LSTM, n-gram, Phrase; session and capture readouts | Choose how harmony is proposed |
| **Phrase and theory** | Bars, Mode, Cadence, Complexity | Define form, resolution, and harmonic permission |
| **Selection and sound** | Seed, Key with maj/min, Spice, Rhythm, Voicing | Choose the starting point, style, timing density, and MIDI arrangement |
| **Health** | Backend light/text, Relink, status, protocol | Confirm that Max, Node, and Python can communicate |
| **Feel** | Straight, Push, Tresillo, Clave 3-2, Clave 2-3, Upbeats, Triplet | Choose the full-chord attack motif |
| **Output** | Large bottom chord display | Show the currently selected or sounding chord symbol |

## How to operate the controls

- **Tabs**: click a visible word such as Phrase, 4, Loop, or Straight.
- **Dials**: click and drag vertically. Drag slowly or use Live’s fine-adjust modifier for small changes.
- **BPM**: drag the number or click and type a value from 40 to 240.
- **Buttons**: Play, Hold, and Sync latch. Reroll and Relink are momentary actions.
- **Info View**: when Live’s Info View is open, hovering a control shows its built-in annotation.
- **Automation**: the visible controls are registered Live parameters. The first parameter bank is Model, Bars, Mode, Seed, Key, Spice, Complexity, and Rhythm.

## Reading the small status area

| Readout | Meaning |
|---|---|
| **Session** | Stateless 0 for Markov; session and a growing step count for RNN, LSTM, or n-gram. In Phrase mode it may reflect the dormant registry model and should be ignored. |
| **Capture state** | Idle, capturing, or looping. Looping means a schedule is installed; it may also appear while Mode is Regen. |
| **Status** | Waiting, ready, playing, stopped, done, reroll, or an error |
| **Protocol** | v4 is correct; v? is still negotiating; legacy is the wrong backend protocol |
| **Backend light** | Green is answering, amber is starting/linking, red is down |
| **Backend text** | Managed/external state or a short repair instruction |
| **Voices** | Distinct MIDI pitches emitted for the current chord |

<!-- PAGE BREAK -->

# 5. Every control and display

## Transport and phrase controls

| Control | Values and default | What it does |
|---|---|---|
| **Play** | Off by default | Starts or stops the device player. Stopping also releases the held chord. |
| **Reroll** | Momentary | While playing, discards the captured material and generates a fresh path. It also resets RNN/LSTM/n-gram history. It does nothing useful while stopped. |
| **Hold** | Off by default | Vamps the current harmony instead of advancing to a new chord. In Phrase mode it freezes phrase time; walk models keep the clock but do not advance the harmony. |
| **Sync** | Free by default | Free uses the device BPM. Sync follows Live’s transport and tempo. |
| **BPM** | 40–240; default 120 | Sets the Free clock only. |
| **Bars** | 2, 4, 8, 16; default 8 | Sets the phrase or capture-cycle length. |
| **Mode** | Loop, Regen, Oneshot; default Loop | Loop captures once and repeats. Regen creates fresh material every cycle. Oneshot plays once and stops. |

## Harmony controls

| Control | Values and default | What it does |
|---|---|---|
| **Model** | Markov, RNN, LSTM, n-gram, Phrase; default Phrase | Selects the generator or whole-phrase engine. |
| **Seed** | 16 fixed chords; default C:maj | Chooses the starting chord. Moving it does not audition. The list is C:maj, A:min, G:maj, F:maj, D:min, E:min, G:7, D:min7, A:min7, C:maj7, F:maj7, E:min7, E:7, A:7, D:7, B:hdim7. |
| **Key** | 12 chromatic roots; default C | Sets the tonic used for transposition and theory decisions. Roots are C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, and B. |
| **maj/min** | maj by default | Sets major or minor mode for the selected root. |
| **Cadence** | 0–100%; default 100% | Controls tonal gravity. Low values wander and may not resolve. High values favor tonic/dominant motion and, in Phrase mode, make an authentic V–I ending more likely. |
| **Complexity** | 0–100%; default 50% | Selects one of five theory permission bands from diatonic triads to altered/remote harmony. It also nudges choices toward the selected band. |
| **Spice** | 0–100%; default 0% in the panel | In Markov, moves from Nottingham folk through POP909 and Bach toward OpenBook jazz while raising sampling temperature. In RNN/LSTM/n-gram, it primarily changes temperature from safer to more varied choices. It does not currently change the Phrase generator. |

## Rhythm and output controls

| Control | Values and default | What it does |
|---|---|---|
| **Rhythm** | 0–100%; default about 33% | In Straight feel, steps through seven full-chord attack densities from one attack every two bars to one attack every beat. |
| **Feel** | Seven named choices; default Straight | Chooses the rhythmic attack motif. Named feels use eighth-note or triplet placement while preserving full chords. |
| **Voicing** | 0–100%; default 0% | Changes register organization and voice leading. Higher bands add open/drop-2 spacing and optional 9th/13th tensions. It does not reduce the backend chord to a triad. |
| **Voices** | Read-only | Shows how many MIDI pitches were sent. Expect 3 or more for playable harmony. |
| **Chord display** | Read-only | Shows the normalized chord symbol, such as G:7, D:min9, or C:maj/E. |

## Backend controls

| Control or display | Meaning |
|---|---|
| **Backend light/text** | Shows whether Python is starting, answering, external, missing dependencies, or blocked. |
| **Relink** | Gives the supervisor a fresh retry budget and restarts or re-adopts the backend. Use it once after correcting a dependency or service problem. |
| **Protocol** | Must say v4 before Complexity can be transmitted. |

> Reroll is an action on an active player. If you want a different starting point while stopped, choose a new Seed and then press Play.

<!-- PAGE BREAK -->

# 6. What each model changes

Every model passes through the same Key, Complexity, and functional-theory policy. The model changes the **proposal and memory**, not the safety rules used to turn the result into a playable chord.

| Model | Memory and behavior | Best use | Important notes |
|---|---|---|---|
| **Markov** | Looks mainly at the current chord and samples a learned next-chord transition. Immediate, transparent, and locally reactive. | Fast jamming, corpus-style morphing, clear cause and effect | Spice has the strongest style meaning here because it moves through folk, pop, Bach, and jazz corpora. |
| **RNN** | Carries a compact recurrent hidden state across steps. Tends toward local neural continuity but can forget or jump sooner than LSTM. | Lightweight neural contrast, evolving short gestures | First selection may pause while torch and the checkpoint load. |
| **LSTM** | Uses gated recurrent memory, usually preserving context longer than the basic RNN. | Longer neural arcs and smoother continuity | “Longer memory” is a tendency, not a guarantee for every sample. First load may pause. |
| **n-gram** | Remembers exact recent cells up to four chord changes, then backs off to shorter context when necessary. | Stable ii–V–I motion, turnarounds, inspectable longer context | Fast and inspectable in structure, but still samples among learned continuations. |
| **Phrase** | Requests an entire N-bar chord-and-duration plan. The phrase engine learns harmonic rhythm and can reserve a V–I cadence. | Most reliable complete phrases, no per-onset network race, recommended starting mode | Phrase is a sequence engine. It does not appear as a Python registry model. |

## How model switching feels in practice

- **Markov → n-gram**: repeated cells and turnarounds usually become more stable because more recent chord history is used.
- **RNN → LSTM**: the LSTM generally holds a longer contextual thread, while the RNN can feel more immediately reactive.
- **Walk models → Phrase**: the unit of generation changes from one chord at a time to a complete form with explicit durations.
- **Phrase → walk model**: Rhythm becomes the direct chord-change template and each onset asks the selected model for the next chord.

## Neural session behavior

RNN and LSTM run statefully in the default automatic session mode. Each chord step advances hidden state, and the model’s output is fed back into the next step. The session readout shows a growing step number. The session resets when:

- playback starts;
- Reroll is pressed;
- a new model is selected;
- the configured maximum session length is reached.

n-gram also carries recent chord history. Markov is stateless.

## Spice by model

| Model | Low Spice | High Spice |
|---|---|---|
| Markov | Nottingham/folk side, sharper probabilities, common transitions | OpenBook/jazz side, flatter probabilities, rarer transitions |
| RNN/LSTM | Lower temperature, more likely/common neural choices | Higher temperature, more varied and less predictable choices |
| n-gram | Stronger preference for frequent learned continuation | More weight available to less common continuations |
| Phrase | Not used by the current Phrase generator | Use Key, Seed, Bars, Cadence, Complexity, Rhythm, and Feel instead |

> Expected model character depends on the bundled training data and checkpoint. These descriptions are useful tendencies, not promises that every generated phrase will sound categorically different.

<!-- PAGE BREAK -->

# 7. Moving from simple to complex harmony

## The implemented five-band Complexity ladder

The dial maps to exact bands:

| Dial region | Tier | Allowed harmonic language | Example in C |
|---|---:|---|---|
| **0–19%** | 0 — Basic | Diatonic root-position triads and direct functional motion | C:maj → F:maj → G:maj → C:maj |
| **20–39%** | 1 — Functional | Diatonic sevenths and occasional first inversions | C:maj7 → D:min7 → G:7 → C:maj7 |
| **40–59%** | 2 — Color/compatibility | Preserves learned model symbols; permits secondary dominants, borrowing, diminished approaches | C:maj7 → A:7 → D:min7 → G:7 |
| **60–79%** | 3 — Advanced | 9ths, 11ths, 13ths, and richer chord color | C:maj9 → E:9 → A:min11 → D:13 |
| **80–100%** | 4 — Altered/remote | Altered dominants, upper structures, occasional tritone substitution, remote chromatic color | C:maj13 → E:7b9 → A:min13 → Db:13#11 |

Higher Complexity **permits** advanced harmony; it does not force every chord to be exotic. A coherent high-tier phrase may still contain a plain tonic.

At the default 50%, the planner is in the compatibility band and tends to preserve the chord quality proposed by the model. Below that point, it simplifies into diatonic material. Above it, the realization layer adds richer chord qualities.

## A controlled way to increase complexity

Make one change at a time:

1. Start with Phrase, Loop, high Cadence, low Complexity, low Voicing, and Straight feel. Leave Spice at 0% because Phrase does not use it.
2. Raise Complexity to about 30% for diatonic sevenths and inversions.
3. Raise Complexity to about 50% to let the learned model vocabulary through.
4. Lower Cadence slightly, to about 75%, if the progression resolves too predictably.
5. Switch to Markov, RNN, LSTM, or n-gram, then raise Spice to 35–50% for a broader proposal distribution.
6. Raise Complexity to about 70% for extensions and richer dominants.
7. Raise Voicing to 70–85% to spread those chords and add local upper tensions.
8. Use Regen or Reroll when you want a genuinely new phrase instead of replaying the captured one.

If a result becomes incoherent, reduce **Spice first** to make choices safer, increase **Cadence** to restore tonal direction, or reduce **Complexity** to narrow the permitted vocabulary.

## Complexity versus Voicing

Consider the difference:

- Complexity may change **G:7** into **G:13** or **G:7b9** because the harmonic identity is richer.
- Voicing may take the same **G:7** and place its pitches in a smoother inversion or wider drop-2 shape.
- At the highest Voicing bands, the device can add local 9th and 13th color even when the selected backend symbol is simpler.

Use the chord display to see the backend/theory symbol and Voices to see the realized MIDI size.

The implemented Voicing bands are:

| Dial region | MIDI realization |
|---|---|
| **0–19%** | Preserve the complete backend chord in a close register; no nearest-voice-leading pass |
| **20–44%** | Preserve the complete chord and enable nearest voice leading |
| **45–69%** | Preserve the complete chord with voice leading and a slightly wider spread allowance |
| **70–87%** | Add a 9th where legal and use open/drop-2 spacing |
| **88–100%** | Add 9th and 13th color with wider open/drop-2 spacing |

Even at Voicing 0, a seventh, extension, alteration, or slash bass selected by the theory backend remains audible.

## Complexity versus Spice

These combinations apply to Markov, RNN, LSTM, and n-gram. Phrase ignores Spice.

- Low Complexity + high Spice: adventurous choices are still constrained to simple legal harmony.
- High Complexity + low Spice: advanced vocabulary is allowed, but the model remains comparatively predictable.
- High Complexity + high Spice: the widest and least predictable result; use Cadence to keep it oriented.

## Current prototype boundary

Tier 4 implements altered and remote chord-level realization. A trained hierarchical planner that deliberately changes local keys and later returns is still a research target. Do not interpret every chromatic chord as a planned modulation.

<!-- PAGE BREAK -->

# 8. Rhythm and Feel

Rhythm and Feel always trigger **whole chords**. They never intentionally split one generated harmony into separate generated notes.

## Straight Rhythm density

With Feel set to Straight, the Rhythm dial selects these seven templates:

| Dial position | Template | Attacks in 4/4 |
|---|---|---|
| Fully left | Two-bar hold | Bar 1 beat 1, then hold for two bars |
| About 17% | Whole bar | Beat 1 |
| About 33% | Half + half | Beats 1 and 3 |
| About 50% | Half + quarter + quarter | Beats 1, 3, and 4 |
| About 67% | Quarter + half + quarter | Beats 1, 2, and 4 |
| About 83% | Quarter + quarter + half | Beats 1, 2, and 3 |
| Fully right | Four quarters | Beats 1, 2, 3, and 4 |

The default is about 33%, or two attacks per bar.

For walk models, a Rhythm change is queued to a clean bar boundary and a Loop is recaptured on its next cycle. In Phrase mode, the existing phrase is rescheduled locally while chord order and total phrase length are preserved.

## Named Feel patterns

| Feel | Device attack pattern | Character |
|---|---|---|
| **Straight** | Uses the selected Rhythm template | Regular, easiest for learning the controls |
| **Push** | Two-bar pattern: beats 1, 3, and the “and” of 4 in each bar | Anticipated phrase endings and forward motion |
| **Tresillo** | Beat 1, the “and” of 2, and beat 4 | Three-part 3–3–2-style syncopation |
| **Clave 3-2** | Bar 1: beat 1, “and” of 2, beat 4; Bar 2: beats 2 and 3 | Two-bar asymmetric device pattern |
| **Clave 2-3** | Bar 1: beats 1, 3, 4; Bar 2: beat 1, “and” of 2, beat 4 | Reversed two-bar device pattern |
| **Upbeats** | Initial downbeat followed by the “and” of each beat | Off-beat propulsion |
| **Triplet** | Three evenly spaced full-chord attacks per bar on the quarter-triplet grid | Rolling three-across-four motion |

The first chord and a final downbeat cadence remain structural anchors in Phrase mode. Internal events may move toward the selected motif, and extra attacks retrigger the currently active **complete chord**.

## Rhythm and Feel interaction in the current build

Straight is the mode in which the Rhythm dial gives the clearest seven-step density sweep. A named Feel supplies its own main motif, so its fixed attack positions dominate the retrigger pattern while the phrase’s original chord events remain. If moving Rhythm appears to do little under Tresillo, Push, Clave, Upbeats, or Triplet, return Feel to Straight to hear the density templates directly.

## Choosing a useful rhythm

- Sparse pad or ambient bed: Straight, Rhythm fully left or about 17%.
- Pop piano: Straight, Rhythm about 33% or 50%.
- Funky comping: Upbeats or Push.
- Latin-influenced pulse: Tresillo, Clave 3-2, or Clave 2-3.
- Rolling polyrhythmic feel: Triplet.
- Dense testing: Straight, Rhythm fully right. This is useful for proving that every rapid attack still emits a full chord.

<!-- PAGE BREAK -->

# 9. Practical sound recipes

Percentages are approximate. Use your ears and keep the following instrument polyphonic.

## Clean pop progression

| Control | Setting |
|---|---|
| Model | Phrase |
| Bars / Mode | 4 / Loop |
| Key | Song key, major or minor |
| Cadence | 90% |
| Complexity | 15–25% |
| Spice | 0% (not used by Phrase) |
| Rhythm / Feel | 33% / Straight |
| Voicing | 20–35% |

Why it works: low Complexity keeps the harmony diatonic, high Cadence gives clear direction, and modest voice leading prevents block chords from jumping unnecessarily.

## Neo-soul or modern jazz color

| Control | Setting |
|---|---|
| Model | Phrase or n-gram |
| Bars / Mode | 8 / Regen |
| Key | Eb:maj, Bb:maj, C:min, or the song key |
| Cadence | 65–80% |
| Complexity | 65–75% |
| Spice | 55–70% with n-gram; ignored by Phrase |
| Rhythm / Feel | 50% / Push or Upbeats |
| Voicing | 75–90% |

Why it works: extensions come from Complexity and high Voicing opens the texture. With n-gram, Spice also increases sampling variety; Phrase ignores Spice.

## Latin-influenced harmonic loop

| Control | Setting |
|---|---|
| Model | n-gram or Phrase |
| Bars / Mode | 4 or 8 / Loop |
| Cadence | 80–95% |
| Complexity | 35–55% |
| Spice | 35–50% with n-gram; ignored by Phrase |
| Feel | Tresillo or either Clave |
| Voicing | 35–55% |

Why it works: n-gram stabilizes recurring cells when selected, the named Feel carries the rhythmic identity, and moderate Complexity avoids overcrowding the groove.

## Slow ambient evolution

| Control | Setting |
|---|---|
| Model | LSTM or Phrase |
| Bars / Mode | 16 / Regen |
| Cadence | 35–55% |
| Complexity | 40–60% |
| Spice | 20–40% with LSTM; ignored by Phrase |
| Rhythm / Feel | Fully left / Straight |
| Voicing | 70–85% |

Why it works: long form, sparse attacks, and open voicing create movement without rhythmic clutter. Lower Cadence lets the harmony float.

## Controlled experimental harmony

| Control | Setting |
|---|---|
| Model | RNN, LSTM, or n-gram |
| Bars / Mode | 4 / Regen |
| Cadence | 45–70% |
| Complexity | 85–100% |
| Spice | 65–85% |
| Rhythm / Feel | 67% / Push or Triplet |
| Voicing | 85–100% |

Why it works: the theory layer permits altered harmony, the model explores a wider distribution, and Cadence remains high enough to prevent complete drift.

## Diagnose harmony with a plain sound

Before judging a model, use a dry piano with no arpeggiator, long release, scale lock, chord device, or MIDI randomizer. Once the chord and Voices displays agree with what you hear, restore your production chain.

<!-- PAGE BREAK -->

# 10. Performance workflow

## Build a stable loop, then perform it

1. Select Phrase, 4 or 8 bars, Loop, Straight, and moderate settings.
2. Press Play. The capture display changes while material is prepared.
3. Wait until the loop repeats.
4. Move Voicing, Rhythm, or Feel for an arrangement or timing change that preserves the current Phrase harmony.
5. Move Complexity, Key, or Cadence when you want the next phrase to be rebuilt.
6. Press Reroll for an immediate fresh path while playback is active.
7. Use Hold to vamp a good chord.
8. Release Hold and continue, or Stop to release all held pitches.

## Choosing Loop, Regen, or Oneshot

- **Loop** is safest on stage. It captures material once and repeats without new OSC requests when unchanged.
- **Regen** is best for evolving music. Phrase mode prefetches the next plan near the end of the current one.
- **Oneshot** is best for fills, transitions, and controlled recording. It stops and releases notes at the end.

## When settings take effect

- Voicing changes affect the next chord.
- Hold acts immediately.
- In Phrase mode, Rhythm and Feel reschedule the installed plan locally while preserving its chord order.
- A Straight Rhythm change in walk mode waits for a clean bar boundary.
- Complexity, Key, Cadence, model, and phrase-length changes invalidate old prefetched phrase material and are heard on the next generated cycle.
- Reroll restarts the active generation process.
- Switching to RNN or LSTM for the first time may take several seconds while the checkpoint loads.

## Recording the result

Route or capture the generated MIDI using Ableton’s normal MIDI-recording workflow. The device emits actual note messages, so a downstream MIDI track can record the chord pitches. Record a short test first and confirm that note-offs occur at chord boundaries.

# 11. MIDI controller use

The device accepts MIDI notes, Program Change messages, and one mapped Control Change.

## Playing keyboard notes into the device

A note-on is converted by pitch class into a major seed symbol:

- C becomes C:maj;
- F# becomes F#:maj;
- Bb becomes Bb:maj.

That chord is sent to the selected walk model, and the **model’s reply** is sonified. The result is not necessarily the exact note or chord you played. Track arming or Monitor In/Auto is needed when using an external controller as input.

## Optional MPK-style Program Change map

Configure pads to send Program Change numbers if you want the built-in performance map:

| Program Change | Action |
|---:|---|
| 0 | Play/Stop toggle |
| 1 | Reroll |
| 2 | Hold toggle |
| 3 | Cycle Loop → Regen → Oneshot |
| 4, 5, 6, 7 | Select 2, 4, 8, or 16 bars |
| 16–27 | Select key root C through B in chromatic order |
| 28 | Major mode |
| 29 | Minor mode |

CC 1 controls the hidden **Adventure** dimension directly. This changes sampling temperature without moving the visible Spice dial’s corpus-style position.

Program Change mapping is optional. Standard note pads may instead seed the model through the note-input behavior above.

<!-- PAGE BREAK -->

# 12. Troubleshooting

## Fast recovery sequence

Use this exact order when the device appears dead:

1. Click Stop on the device and save the Live Set.
2. Remove **every** Chord Markov Performer v4 instance from the Set.
3. Confirm no second Live Set or Max window is holding another v4 instance.
4. Drag the exact fresh file **versions/v4-theory/max/Chord Markov Performer v4.amxd** into the Set.
5. Keep the complete v4 folder in its original structure.
6. Place a plain polyphonic piano after the device.
7. Wait for green **up (managed)** or **up (external)** and protocol **v4**.
8. If it remains amber or red, click Relink once and wait.
9. Select Phrase, 4 bars, Loop, Free, 120 BPM, Straight, and press Play.
10. Check the chord display and Voices before changing any other setting.

## Symptom table

| Symptom | Likely cause | What to do |
|---|---|---|
| Device has no usable panel | Wrong file or a stale loaded container | Remove it and drag the exact v4 AMXD, not the maxpat or an older Performer. |
| Backend says finding python or starting | Normal startup or interpreter probe | Wait. If it never changes, click Relink once. |
| Backend says need python-osc | No discovered Python can import python-osc | Install the Python requirements, then reload or Relink. |
| Backend says up (no torch) | Python OSC works but torch is unavailable | Use Markov, n-gram, or Phrase, or install torch before using RNN/LSTM. |
| Backend says run npm install | node-osc is missing | Run npm install inside versions/v4-theory/max, then reload the AMXD. |
| Backend says remove 2nd copy | Another v4 instance already owns UDP 9101 | Remove all duplicates and load one fresh instance. |
| Backend is green but protocol says v? | Handshake has not completed | Wait briefly, then Relink. Confirm the correct v4 backend is on 9100/9101. |
| Protocol says legacy | An incompatible service is answering on the v4 port | Close the stale service and reload so the v4 supervisor can launch the correct backend. |
| Play is lit but no chords occur | Sync is on while Live transport is stopped | Start Live or switch Sync back to Free. |
| BPM has no effect | Sync is on | BPM is ignored in Sync mode; use Live’s global tempo. |
| Voices is 0 | Silence event, parser error, missing chord, or no valid backend reply | Check the chord/status display, switch to a common Seed, and Relink if needed. |
| Voices is 3 or more but only one note is audible | Downstream instrument is mono/legato, an arpeggiator is active, or external hardware is monophonic | Select polyphonic mode and test with a plain Ableton piano. |
| First chord works, later chords collapse to one note | Ableton is still running the pre-repair embedded device | Remove every instance and load the exact fresh v4 AMXD again. |
| Chords repeat without change | Hold is on, Loop is replaying as designed, Spice is very low in a walk model, or a seed fell back to itself | Turn off Hold, choose Regen or Reroll, and use a common Seed. In a walk model, raise Spice slightly; Phrase ignores it. |
| Reroll appears to do nothing | Player is stopped | Press Play first; Reroll acts on an active player. |
| Rhythm seems ineffective | A named Feel is supplying its fixed motif | Return Feel to Straight to audition the seven density templates. |
| RNN/LSTM selection appears frozen | Torch and the checkpoint are loading for the first time | Wait several seconds. Do not repeatedly press Relink during the load grace window. |
| High Complexity still produces a simple chord | Complexity permits rather than mandates advanced harmony | Listen across a complete phrase or use Regen/Reroll; this is expected. |
| Notes hang after an interruption | The normal Stop message was bypassed by a crash or reload | Click the device Play/Stop control, deactivate/reactivate the device, or reload the single fresh instance. |

If an error is too long for the compact panel, open the Max Console from the device editor and read the complete Node/Python message.

## Hidden automation from older Sets

The compact v4 panel hides inherited **Major**, **Minor**, **Seventh**, and legacy **Triplet** parameters. Leave Major, Minor, and Seventh at zero when evaluating theory output; old automation on them can recolor or simplify the parsed chord after generation. Use the visible Feel selector instead of the hidden Triplet parameter.

## OSC smoke test

When the interface is loaded but communication is still uncertain, run:

    cd /Users/zacharyscheffler/Desktop/FinalMaxUPF/versions/v4-theory/python
    python3 scripts/osc_smoke_test.py --spawn-service --python-port 9100 --max-port 9101

## Ports and instance limit

| Role | V4 endpoint |
|---|---:|
| Python receives | 127.0.0.1:9100 |
| Max receives replies | 127.0.0.1:9101 |

The fixed Max reply port means **one v4 Performer instance per running Max/Live environment**. Older v3 services use 9000/9001 and are intentionally separate.

## What Voices tells you

- **0**: no playable MIDI chord was emitted.
- **3**: normal triad or a repaired minimum chord.
- **4**: common seventh chord or an added voice.
- **5 or more**: extensions, slash bass, added harmony, or high Voicing color.

Voices counts distinct pitches sent by the device. It does not prove that the following instrument can play them simultaneously.

<!-- PAGE BREAK -->

# 13. Chord-symbol and theory glossary

## Reading the chord display

| Symbol | Meaning |
|---|---|
| C:maj | C major triad |
| A:min | A minor triad |
| G:7 | G dominant seventh |
| C:maj7 | C major seventh |
| D:min7 | D minor seventh |
| B:hdim7 | B half-diminished seventh |
| D:min9 | D minor ninth |
| G:7b9 | G dominant seventh with a flat ninth |
| C:maj/E | C major with E in the bass |
| N.C. | No chord; release the current notes |

**7** and **maj7** are different. G:7 contains a minor seventh and usually wants to resolve. G:maj7 contains a major seventh and has a more stable color.

## Essential terms

| Term | Plain-language meaning |
|---|---|
| **Seed** | The chord from which generation starts or restarts |
| **Key** | The tonal home used to interpret scale degrees and legal harmony |
| **Tonic** | The home chord, I |
| **Predominant** | A chord that tends to lead toward the dominant, such as ii or IV |
| **Dominant** | A tension chord, usually V or V7, that tends to lead home |
| **Cadence** | A phrase-ending motion; V–I is the main authentic cadence used here |
| **Borrowing** | Using a chord from the parallel major/minor mode |
| **Secondary dominant** | A temporary dominant that points to a chord other than the tonic |
| **Extension** | A 9th, 11th, or 13th added to the basic chord |
| **Alteration** | A raised or lowered chord tone such as b9 or #11 |
| **Inversion** | A chord tone other than the root placed in the bass |
| **Voicing** | The register and spacing of the chord’s MIDI pitches |
| **Voice leading** | Moving individual chord tones by small distances between chords |
| **Retrigger** | Reattacking the same complete chord without selecting a new harmony |
| **Capture** | The first pass in which a walk model builds material for Loop |
| **Session** | The model history retained by RNN, LSTM, or n-gram |

<!-- PAGE BREAK -->

# 14. One-page operating checklist

## Before pressing Play

- One fresh **Chord Markov Performer v4.amxd** instance only.
- Complete v4 folder remains together.
- Device is before a polyphonic instrument.
- Backend is green and says up.
- Protocol says v4.
- Feel is Straight for the simplest test.
- Sync says Free unless Live transport is already running.

## Safe musical starting point

| Control | Value |
|---|---|
| Model | Phrase |
| Bars | 4 |
| Mode | Loop |
| Seed / Key | C:maj / C:maj, or match your song |
| Cadence | 85–100% |
| Complexity | 25–35% |
| Spice | 0% (not used by Phrase) |
| Rhythm | About 33% |
| Voicing | 20–35% |
| Feel | Straight |

## To make it more interesting

- More advanced chords: raise Complexity.
- More surprise or jazz-corpus influence: choose Markov, RNN, LSTM, or n-gram, then raise Spice. Phrase ignores Spice.
- Less predictable resolution: lower Cadence.
- Wider and smoother MIDI chords: raise Voicing.
- More frequent attacks: raise Rhythm while Feel is Straight.
- More syncopation: choose a named Feel.
- A new phrase: choose Regen or press Reroll while playing.
- A sustained vamp: turn on Hold.

Do not turn Hold on before Phrase has sounded its first chord; Phrase time is frozen and the device can remain silent until Hold is released.

## If there is no sound

1. Look at Voices.
2. If Voices is 3 or more, fix the downstream instrument or MIDI chain.
3. If Voices is 0, check backend, protocol, Sync, and status.
4. Remove every old instance and load the exact fresh v4 AMXD.
5. Use Relink only after the device and dependencies are correct.

## Version identity

This manual applies to the isolated **4.0.0-dev** theory prototype on OSC ports **9100/9101**, built from **Chord Markov Performer v4.amxd**. The archived v3 devices and other sibling AMXDs have different controls, ports, and chord behavior.
