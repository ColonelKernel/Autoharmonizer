#!/usr/bin/env python3
"""Train the phrase model: an observed-state, explicit-duration (semi-Markov)
chain over ROOT MOTION, from data/jazznet/chords.json.

Why this shape (the full argument follows):

  * The SEQUENCE, not the chord, is the unit. Each training sequence is
    run-length-encoded into (quality, duration_beats, onset_beat) segments —
    one slot in chords.json is one beat (confirmed: 497/933 sequences are
    exactly 128 slots = 32 bars of 4/4).

  * HARMONIC RHYTHM IS LEARNED, not templated. A plain Markov chain gives each
    chord a geometric dwell time, which cannot express "chords change on the
    downbeat or mid-bar". So we keep an EXPLICIT duration histogram per state,
    conditioned on metric position: D(d | quality, onset mod 4). That explicit
    duration law is the *semi*-Markov part, and it is the whole point.

  * NO KEY IS ESTIMATED. JazzNet is chains of ii-V-I cells that modulate
    constantly: tonic heuristics agree only ~25% of the time, ~60% of
    sequences end on an unresolved dominant, and a diatonic-degree alphabet
    built on a guessed tonic sends 58% of chords to an "other" bucket. So the
    state is ROOT MOTION — the interval from the previous chord's root plus
    the new chord's quality — which needs no key at all and covers 100% of the
    data. The descending-fifth ii-V-I backbone shows up as motion +5.
    The user's requested key supplies the one absolute anchor, at GENERATION
    time only.

  * There is NO hidden state, so there is no EM/Baum-Welch. Everything here is
    closed-form counting with add-alpha smoothing and backoff.

Run (from python/):
    /opt/anaconda3/bin/python3 scripts/build_phrase_model.py

Writes data/phrase_model_jazznet.json. Build-time only: the runtime service
imports neither this script nor torch/music21.
"""

from __future__ import annotations

import argparse
import itertools
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
DEFAULT_IN = REPO / "data" / "jazznet" / "chords.json"
DEFAULT_OUT = REPO / "data" / "phrase_model_jazznet.json"

# JazzNet spells flats with a dash (B-, E-). chord_vocab.PITCH_CLASSES rejects
# those, and transpose_chord silently passes unparseable roots through — which
# would emit un-sonifiable chords to Max. We parse to pitch class HERE and the
# engine renders back through CANON_ROOT, so dash-flat spelling never escapes
# this build step.
_ROOT_PC = {
    "C": 0, "C#": 1, "D-": 1, "Db": 1, "D": 2, "D#": 3, "E-": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "G-": 6, "Gb": 6, "G": 7, "G#": 8, "A-": 8,
    "Ab": 8, "A": 9, "A#": 10, "B-": 10, "Bb": 10, "B": 11, "C-": 11,
}

# Durations we model, in beats. Measured run-length shares on the length%4==0
# subset: 2 ≈ 62%, 4 ≈ 28%, 1 ≈ 4.5%, 8 ≈ 4.4%. The ~1.2% at 6/12/16 is dropped.
DURATION_SUPPORT = (1, 2, 4, 8)
ALPHA = 0.1  # add-alpha smoothing on transition counts


def parse_chord(sym: str) -> tuple[int, str] | None:
    """'B-:maj7' -> (10, 'maj7'). None if unparseable."""
    if not sym or ":" not in sym:
        return None
    root, _, quality = sym.partition(":")
    pc = _ROOT_PC.get(root)
    if pc is None or not quality:
        return None
    return pc, quality


def segments(seq: list[str]) -> list[tuple[int, str, int, int]]:
    """Run-length-encode a beat-grid sequence into segments.

    Returns [(root_pc, quality, dur_beats, onset_beat), ...]. Consecutive
    identical symbols are one held chord — that run length IS its duration.
    """
    out: list[tuple[int, str, int, int]] = []
    onset = 0
    for sym, group in itertools.groupby(seq):
        dur = len(list(group))
        parsed = parse_chord(sym)
        if parsed is not None:
            out.append((parsed[0], parsed[1], dur, onset))
        onset += dur
    return out


def normalize(counts: dict, alpha: float = 0.0) -> list[list]:
    """Counter -> [[key, prob], ...] sorted by descending probability."""
    total = sum(counts.values()) + alpha * len(counts)
    if total <= 0:
        return []
    items = [(k, (v + alpha) / total) for k, v in counts.items()]
    items.sort(key=lambda kv: -kv[1])
    return [[list(k) if isinstance(k, tuple) else k, p] for k, p in items]


def find_cadences(segs: list[tuple[int, str, int, int]], final_qualities: set[str],
                  pre_quality: str = "7") -> Counter:
    """Harvest cadence tails KEY-FREE by local pattern: any X -> (+5) dominant
    -> (+5) target. In root-motion terms an authentic cadence is simply two
    descending fifths into a target quality. Returns the final chord's duration
    distribution, which is what the generator needs to size the last bar."""
    durs: Counter = Counter()
    for i in range(1, len(segs)):
        (r_prev, q_prev, _, _) = segs[i - 1]
        (r_cur, q_cur, d_cur, _) = segs[i]
        if q_prev != pre_quality or q_cur not in final_qualities:
            continue
        if (r_cur - r_prev) % 12 == 5:  # descending fifth = ascending fourth
            durs[d_cur] += 1
    return durs


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--chords", type=Path, default=DEFAULT_IN)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()

    seqs = json.loads(args.chords.read_text())
    # Metric position is only defined when the sequence tiles whole bars.
    usable = [s for s in seqs if len(s) % 4 == 0]

    # A(dpc, q' | q): quality-conditioned root motion. Conditioning on the
    # current quality is what captures the ii-V-I grammar (min7 -+5-> 7 -+5-> maj7).
    trans: dict[str, Counter] = defaultdict(Counter)
    trans_marginal: Counter = Counter()
    # D(d | q, m): the learned harmonic rhythm, m = onset beat within the bar.
    dur: dict[str, Counter] = defaultdict(Counter)
    dur_by_pos: dict[int, Counter] = defaultdict(Counter)
    dur_all: Counter = Counter()
    # P(onset metric position). Needed to compare candidate durations that would
    # each place a chord at a DIFFERENT metric position: the joint is
    # P(m) * P(d | q, m), and P(d | q, m) alone is not comparable across m
    # (an off-beat onset is ~always 1 beat, which would otherwise look certain).
    onset_pos: Counter = Counter()
    cad_major: Counter = Counter()
    cad_minor: Counter = Counter()
    qualities: Counter = Counter()
    n_segs = 0

    for seq in usable:
        segs = segments(seq)
        if len(segs) < 2:
            continue
        n_segs += len(segs)
        for (r, q, d, onset) in segs:
            qualities[q] += 1
            if d in DURATION_SUPPORT:
                m = onset % 4
                dur[f"{q}|{m}"][d] += 1
                dur_by_pos[m][d] += 1
                dur_all[d] += 1
                onset_pos[m] += 1
        for i in range(1, len(segs)):
            r0, q0, _, _ = segs[i - 1]
            r1, q1, _, _ = segs[i]
            dpc = (r1 - r0) % 12
            trans[q0][(dpc, q1)] += 1
            trans_marginal[(dpc, q1)] += 1
        cad_major += find_cadences(segs, {"maj7", "maj", "6", "maj6"})
        cad_minor += find_cadences(segs, {"min7", "min", "min6"})

    model = {
        "_comment": "Observed-state explicit-duration (semi-Markov) chain over ROOT MOTION. "
                    "No key estimation; no hidden state; no EM. Built by scripts/build_phrase_model.py.",
        "source": str(args.chords.relative_to(REPO)),
        "n_sequences": len(usable),
        "n_segments": n_segs,
        "duration_support": list(DURATION_SUPPORT),
        "qualities": [q for q, _ in qualities.most_common()],
        # transition[q] = [[[dpc, q'], p], ...]
        "transition": {q: normalize(c, ALPHA) for q, c in trans.items()},
        "transition_marginal": normalize(trans_marginal, ALPHA),
        # duration["q|m"] = [[d, p], ...]  <- the learned harmonic rhythm
        "duration": {k: normalize(c) for k, c in dur.items()},
        "duration_backoff": {str(m): normalize(c) for m, c in dur_by_pos.items()},
        "duration_all": normalize(dur_all),
        "onset_position": normalize(onset_pos),
        "cadence": {
            "major": {"pre": "7", "final": "maj7", "final_dur": normalize(cad_major)},
            "minor": {"pre": "7", "final": "min7", "final_dur": normalize(cad_minor)},
        },
    }
    args.out.write_text(json.dumps(model, indent=1))

    print(f"wrote {args.out.relative_to(REPO)}")
    print(f"  {len(usable)}/{len(seqs)} sequences usable (length % 4 == 0), {n_segs} segments")
    print(f"  {len(trans)} quality states, {len(trans_marginal)} distinct (motion, quality) transitions")
    print(f"  duration histogram (all): {[(d, round(p, 3)) for d, p in model['duration_all']]}")
    print(f"  onset beat 2 durations:   {[(d, round(p, 3)) for d, p in model['duration_backoff']['2']][:3]}")
    print(f"  onset metric positions:   {[(m, round(p, 3)) for m, p in model['onset_position']]}")
    print(f"  major cadence tails: {sum(cad_major.values())}   minor: {sum(cad_minor.values())}")
    top = model["transition_marginal"][:5]
    print(f"  top motions: {[(f'+{k[0]}->{k[1]}', round(p, 3)) for k, p in top]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
