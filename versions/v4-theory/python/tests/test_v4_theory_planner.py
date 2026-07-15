"""Focused contract tests for the v4 theory-aware candidate planner.

These tests intentionally avoid asserting exact score constants.  The public
contract is musical: the complexity dial gates harmonic devices, gravity can
pull a dominant home, and seeded selection is reproducible.
"""

from __future__ import annotations

import pytest

from src.harmony.planner import HarmonyPlanner
from src.harmony.theory import (
    chord_complexity_tier,
    complexity_level,
    is_diatonic,
)


def _symbol(selected: tuple[str, float]) -> str:
    """Keep assertions readable while still pinning the documented tuple API."""
    symbol, probability = selected
    assert isinstance(probability, float)
    assert 0.0 <= probability <= 1.0
    return symbol


def test_complexity_level_is_a_clamped_monotonic_five_step_ladder():
    samples = [complexity_level(i / 20) for i in range(-4, 25)]

    assert samples[0] == 0
    assert samples[-1] == 4
    assert samples == sorted(samples)
    assert set(samples) == {0, 1, 2, 3, 4}


@pytest.mark.parametrize(
    "chord,key,expected",
    [
        ("C:maj", "C:maj", 0),       # diatonic triad
        ("D:min", "C:maj", 0),       # diatonic predominant triad
        ("C:maj7", "C:maj", 1),      # diatonic seventh
        ("A:7", "C:maj", 2),         # V/ii secondary dominant
        ("F:min", "C:maj", 2),       # borrowed iv from the parallel minor
        ("Db:7", "C:maj", 3),        # tritone substitute for V
        ("C:maj9", "C:maj", 3),      # upper extension
        ("G:7b9", "C:maj", 4),       # explicitly altered dominant
    ],
)
def test_chord_complexity_tier_recognizes_theory_devices(chord, key, expected):
    assert chord_complexity_tier(chord, key) == expected


@pytest.mark.parametrize(
    "chord,key,expected",
    [
        ("C:maj7", "C:maj", True),
        ("D:min7", "C:maj", True),
        ("G:7", "C:maj", True),
        ("A:7", "C:maj", False),
        ("F:min", "C:maj", False),
        ("C:maj7/E", "C:maj", True),
    ],
)
def test_is_diatonic_checks_all_chord_tones_and_ignores_slash_inversion(
    chord, key, expected
):
    assert is_diatonic(chord, key) is expected


def test_basic_complexity_rejects_chromatic_candidate_even_with_larger_prior():
    planner = HarmonyPlanner(
        key="C:maj", complexity=0.0, gravity=0.0, seed=7
    )
    choices = [("Db:7", 0.99), ("G:maj", 0.01)]

    assert _symbol(planner.choose("C:maj", choices, "markov")) == "G:maj"


def test_full_complexity_keeps_a_strong_advanced_candidate_available():
    planner = HarmonyPlanner(
        key="C:maj", complexity=1.0, gravity=0.0, seed=7
    )
    choices = [("Db:7", 0.999), ("G:maj", 0.001)]

    assert _symbol(planner.choose("C:maj", choices, "ngram")) == "Db:7"


def test_gravity_makes_dominant_resolution_more_likely():
    choices = [("F#:maj", 0.5), ("C:maj", 0.5)]
    free = HarmonyPlanner(
        key="C:maj", complexity=1.0, gravity=0.0, seed=11
    )
    pulled = HarmonyPlanner(
        key="C:maj", complexity=1.0, gravity=1.0, seed=11
    )

    free_tonics = sum(
        _symbol(free.choose("G:7", choices, "lstm")) == "C:maj"
        for _ in range(300)
    )
    pulled_tonics = sum(
        _symbol(pulled.choose("G:7", choices, "lstm")) == "C:maj"
        for _ in range(300)
    )

    assert pulled_tonics > free_tonics + 40


def test_planner_never_returns_a_symbol_outside_the_candidate_set():
    planner = HarmonyPlanner(
        key="C:maj", complexity=0.7, gravity=0.5, seed=19
    )
    choices = [("D:min7", 0.4), ("G:7", 0.35), ("C:maj7", 0.25)]

    selected = planner.choose("A:min7", choices, "rnn")
    assert selected in choices


def test_seeded_planners_make_the_same_sequence_of_choices():
    choices = [("F:maj", 0.34), ("G:7", 0.33), ("A:min", 0.33)]
    a = HarmonyPlanner(key="C:maj", complexity=0.8, gravity=0.0, seed=23)
    b = HarmonyPlanner(key="C:maj", complexity=0.8, gravity=0.0, seed=23)

    seq_a = [a.choose("C:maj", choices, "markov") for _ in range(12)]
    seq_b = [b.choose("C:maj", choices, "markov") for _ in range(12)]

    assert seq_a == seq_b
