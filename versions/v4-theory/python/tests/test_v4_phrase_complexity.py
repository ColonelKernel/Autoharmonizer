"""Complexity control must preserve the phrase engine's timing guarantees."""

from __future__ import annotations

from pathlib import Path

from src.engines.phrase_engine import PhraseEngine
from src.harmony.theory import (
    chord_complexity_tier,
    harmonic_function,
    is_diatonic,
    parse_chord,
)


MODEL = Path(__file__).resolve().parents[2] / "data" / "phrase_model_jazznet.json"


def _diatonic_share(phrases, key):
    chords = [chord for phrase in phrases for chord, _duration in phrase]
    return sum(is_diatonic(chord, key) for chord in chords) / len(chords)


def _mean_tier(phrases, key):
    tiers = [
        chord_complexity_tier(chord, key)
        for phrase in phrases
        for chord, _duration in phrase
    ]
    return sum(tiers) / len(tiers)


def test_set_complexity_preserves_exact_length_and_forced_cadence():
    engine = PhraseEngine(MODEL, seed=2)

    for complexity in (0.0, 0.25, 0.5, 0.75, 1.0):
        engine.set_complexity(complexity)
        phrase = engine.generate(4, "C:maj", cadence=1.0, seed=42)
        assert sum(duration for _chord, duration in phrase) == 16
        pre = parse_chord(phrase[-2][0])
        final = parse_chord(phrase[-1][0])
        assert pre is not None and harmonic_function(pre, "C:maj") == "D"
        assert final is not None and final.root_pc == 0
        assert harmonic_function(final, "C:maj") == "T"
        assert phrase[-1][1] == 4


def test_complexity_changes_harmonic_distribution_not_randomness_only():
    engine = PhraseEngine(MODEL)

    engine.set_complexity(0.0)
    simple = [
        engine.generate(8, "C:maj", cadence=0.4, seed=seed)
        for seed in range(80)
    ]
    engine.set_complexity(1.0)
    complex_ = [
        engine.generate(8, "C:maj", cadence=0.4, seed=seed)
        for seed in range(80)
    ]

    # A complexity control should admit more advanced devices; it must not be
    # an alias for cadence/gravity or merely a fresh random draw.
    assert _mean_tier(complex_, "C:maj") > _mean_tier(simple, "C:maj")
    assert _diatonic_share(simple, "C:maj") > _diatonic_share(complex_, "C:maj")


def test_complexity_is_deterministic_for_an_explicit_generation_seed():
    a = PhraseEngine(MODEL)
    b = PhraseEngine(MODEL)
    a.set_complexity(0.8)
    b.set_complexity(0.8)

    assert a.generate(8, "Eb:maj", cadence=0.6, seed=91) == b.generate(
        8, "Eb:maj", cadence=0.6, seed=91
    )
