"""Tests for the sequence-level phrase generator.

Structural tests pin the contract the Max device depends on (exact length,
sonifiable symbols, a real cadence). The distributional tests are the ones that
actually demonstrate the point of the model: that harmonic rhythm is LEARNED
(durations match the corpus, chord changes land on strong beats) rather than
imposed by a template.
"""

from __future__ import annotations

import collections
from pathlib import Path

import pytest

from src.chord_vocab import CANON_ROOT, PITCH_CLASSES, QUALITY_INTERVALS, parse_key
from src.engines.phrase_engine import PhraseEngine, PhraseModelError

MODEL = Path(__file__).resolve().parent.parent.parent / "data" / "phrase_model_jazznet.json"
SUPPORT = {1, 2, 4, 8}

# Fixed-seed output. Both are idiomatic, which is the point: a I-vi-ii-V-ii-V-I
# turnaround and a minor i-V7-i, from a model that never saw a key label.
GOLDEN_C4 = [("C:maj7", 2), ("A:min7", 2), ("D:min7", 2), ("G:7", 2),
             ("D:min7", 2), ("G:7", 2), ("C:maj7", 4)]
GOLDEN_AMIN2 = [("A:min7", 2), ("E:7", 2), ("A:min7", 4)]


@pytest.fixture(scope="module")
def engine() -> PhraseEngine:
    return PhraseEngine(MODEL)


def onsets(phrase):
    """Absolute onset beat of each chord."""
    acc, out = 0, []
    for _, d in phrase:
        out.append(acc)
        acc += d
    return out


# --- contract ------------------------------------------------------------

def test_missing_model_raises():
    with pytest.raises(PhraseModelError):
        PhraseEngine("/nonexistent/phrase_model.json")


@pytest.mark.parametrize("bars", [2, 4, 8, 16])
@pytest.mark.parametrize("key", ["C:maj", "A:min", "Eb:maj", "F#:min"])
def test_exact_length_and_support(engine, bars, key):
    for seed in range(12):
        phrase = engine.generate(bars, key, seed=seed)
        assert sum(d for _, d in phrase) == bars * 4, phrase
        assert phrase, "never return an empty phrase"
        # Durations are drawn from the support; the only larger values come from
        # coalescing a held chord at the cadence splice.
        assert all(isinstance(d, int) and d >= 1 for _, d in phrase), phrase
        in_support = sum(1 for _, d in phrase if d in SUPPORT)
        assert in_support >= len(phrase) - 1, phrase


@pytest.mark.parametrize("bars", [2, 4, 8, 16])
@pytest.mark.parametrize("cadence", [0.0, 1.0])
def test_no_adjacent_duplicate_chords(engine, bars, cadence):
    """A repeated symbol would re-trigger the chord instead of sustaining it.
    Splicing the cadential V onto a body already ending on the V is the way
    this can happen, so it must be coalesced away."""
    for seed in range(40):
        phrase = engine.generate(bars, "C:maj", cadence=cadence, seed=seed)
        symbols = [c for c, _ in phrase]
        assert all(a != b for a, b in zip(symbols, symbols[1:])), phrase


@pytest.mark.parametrize("key", ["C:maj", "A:min", "Bb:maj", "G:min", "F#:maj"])
def test_every_symbol_is_sonifiable(engine, key):
    """Symbols must use the runtime spelling (Bb, never the corpus's B-) and a
    quality the Max chord parser knows — else the device plays nothing."""
    for seed in range(20):
        for chord, _ in engine.generate(8, key, seed=seed):
            root, _, quality = chord.partition(":")
            assert root in CANON_ROOT, chord
            assert "-" not in chord, f"corpus spelling leaked out: {chord}"
            assert quality in QUALITY_INTERVALS, chord


@pytest.mark.parametrize("key,final_q", [("C:maj", "maj7"), ("A:min", "min7"), ("Eb:maj", "maj7")])
def test_forced_cadence_resolves_to_tonic(engine, key, final_q):
    tonic_pc, _ = parse_key(key)
    for seed in range(25):
        phrase = engine.generate(4, key, cadence=1.0, seed=seed)
        last_chord, last_dur = phrase[-1]
        root, _, quality = last_chord.partition(":")
        assert PITCH_CLASSES[root] == tonic_pc, f"{key}: ended on {last_chord}"
        assert quality == final_q
        assert last_dur == 4, "the tonic owns the final bar"
        # ...reached by an authentic V(7) -> I
        pre_chord, _ = phrase[-2]
        pre_root, _, pre_quality = pre_chord.partition(":")
        assert pre_quality == "7"
        assert PITCH_CLASSES[pre_root] == (tonic_pc + 7) % 12, f"{pre_chord} is not the V of {key}"


def test_cadence_zero_lets_the_phrase_wander(engine):
    """cadence=0 must NOT resolve every time — that's the whole dial."""
    tonic_pc, _ = parse_key("C:maj")
    resolved = 0
    for seed in range(60):
        phrase = engine.generate(4, "C:maj", cadence=0.0, seed=seed)
        root = phrase[-1][0].partition(":")[0]
        resolved += PITCH_CLASSES[root] == tonic_pc
    assert resolved < 30, f"cadence=0 still resolved {resolved}/60 times"


def test_determinism_same_seed(engine):
    a = engine.generate(8, "C:maj", seed=99)
    b = PhraseEngine(MODEL).generate(8, "C:maj", seed=99)
    assert a == b


def test_different_seeds_differ(engine):
    variants = {tuple(engine.generate(8, "C:maj", seed=s)) for s in range(10)}
    assert len(variants) > 1


def test_seed_chord_starts_the_walk(engine):
    phrase = engine.generate(8, "C:maj", seed_chord="D:min7", seed=5)
    assert phrase[0][0] == "D:min7"


def test_unknown_key_falls_back_to_c(engine):
    phrase = engine.generate(4, "not-a-key", seed=1)
    assert sum(d for _, d in phrase) == 16
    assert phrase[-1][0].startswith("C:")


def test_short_phrase_still_cadences(engine):
    """2 bars is the common performance case and the tightest constraint."""
    phrase = engine.generate(2, "C:maj", cadence=1.0, seed=3)
    assert sum(d for _, d in phrase) == 8
    assert phrase[-1][0] == "C:maj7" and phrase[-2][0] == "G:7"


# --- the model actually learned harmonic rhythm ---------------------------

def test_durations_match_the_corpus_histogram(engine):
    """The generated duration distribution should track the trained one
    (measured: 2 beats ~57%, 4 ~34%, 8 ~6%, 1 ~4%). A template-driven or
    geometric-dwell model could not reproduce this shape."""
    counts: collections.Counter = collections.Counter()
    for seed in range(500):
        for _, d in engine.generate(8, "C:maj", cadence=0.0, seed=seed):
            counts[d] += 1
    total = sum(counts.values())
    share = {d: counts[d] / total for d in SUPPORT}
    assert 0.40 < share[2] < 0.75, share
    assert 0.15 < share[4] < 0.50, share
    assert share[1] < 0.20, share
    assert share[2] > share[4] > share[8], share


def test_chord_changes_land_on_strong_beats(engine):
    """In the corpus 97.7% of chord onsets fall on beat 0 or 2 of the bar.
    This is metric sense, and it emerges from D(d | quality, onset mod 4)."""
    strong = weak = 0
    for seed in range(300):
        for o in onsets(engine.generate(8, "C:maj", seed=seed)):
            if o % 4 in (0, 2):
                strong += 1
            else:
                weak += 1
    frac = strong / (strong + weak)
    assert frac > 0.90, f"only {frac:.1%} of onsets on strong beats"


def test_descending_fifth_backbone_dominates(engine):
    """+5 root motion (the ii-V-I backbone) should be the most common motion —
    learned from root motion alone, with no key ever estimated in training."""
    motions: collections.Counter = collections.Counter()
    for seed in range(300):
        phrase = engine.generate(8, "C:maj", cadence=0.0, seed=seed)
        pcs = [PITCH_CLASSES[c.partition(":")[0]] for c, _ in phrase]
        for a, b in zip(pcs, pcs[1:]):
            motions[(b - a) % 12] += 1
    assert motions.most_common(1)[0][0] == 5, motions.most_common(4)


def _diatonic_fraction(engine, key, mode, gravity, n=200):
    from src.engines.phrase_engine import DIATONIC
    tonic = PITCH_CLASSES[key.partition(":")[0]]
    home = DIATONIC[mode]
    ok = total = 0
    for seed in range(n):
        for chord, _ in engine.generate(8, key, cadence=gravity, seed=seed):
            root, _, quality = chord.partition(":")
            degree = (PITCH_CLASSES[root] - tonic) % 12
            ok += all((degree + iv) % 12 in home for iv in QUALITY_INTERVALS[quality])
            total += 1
    return ok / total


@pytest.mark.parametrize("key,mode", [("C:maj", "maj"), ("A:min", "min")])
def test_cadence_dial_is_tonal_gravity(engine, key, mode):
    """The Cadence dial keeps the phrase in key, not just its ending. Trained
    key-free, so this pull exists only at generation, where the key is known."""
    free = _diatonic_fraction(engine, key, mode, 0.0)
    home = _diatonic_fraction(engine, key, mode, 1.0)
    assert home > free + 0.25, f"{key}: gravity 0 -> {free:.1%}, gravity 1 -> {home:.1%}"
    assert free > 0.10, "gravity=0 must still reproduce the corpus, not noise"
    assert home < 0.95, "colour chords (secondary dominants) must stay reachable"


def test_minor_key_avoids_the_major_tonic(engine):
    """Root-only gravity wrongly admits A:maj7 in A minor; chord-level gravity
    (all notes in the scale) must make the tonic minor overwhelmingly."""
    tonic_major = tonic_total = 0
    for seed in range(120):
        for chord, _ in engine.generate(8, "A:min", cadence=1.0, seed=seed):
            root, _, quality = chord.partition(":")
            if PITCH_CLASSES[root] == PITCH_CLASSES["A"]:
                tonic_total += 1
                tonic_major += quality in ("maj", "maj7", "6", "maj6")
    assert tonic_total > 0
    assert tonic_major / tonic_total < 0.15, f"{tonic_major}/{tonic_total} tonics were major"


def test_golden_regression(engine):
    """Locks the sampler: any change to draw order or distributions shows up."""
    assert engine.generate(4, "C:maj", cadence=1.0, seed=42) == GOLDEN_C4
    assert engine.generate(2, "A:min", cadence=1.0, seed=11) == GOLDEN_AMIN2
