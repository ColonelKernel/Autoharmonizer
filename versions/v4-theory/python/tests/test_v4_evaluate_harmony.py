"""Tests for the offline v4 harmony evaluation harness."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from scripts.evaluate_harmony import (
    aggregate_batches,
    evaluate_sampler,
    harmonic_note_count,
    is_single_note_risk,
    progression_metrics,
)


@pytest.mark.parametrize(
    "symbol,expected",
    [
        ("C:maj", 3),
        ("G:7", 4),
        ("C:maj9", 5),
        ("C:maj/E", 3),
        ("C:maj/Db", 4),
        ("N", 0),
    ],
)
def test_harmonic_note_count_is_a_distinct_pitch_class_lower_bound(symbol, expected):
    assert harmonic_note_count(symbol) == expected


@pytest.mark.parametrize(
    "symbol,expected",
    [
        ("C:maj", False),
        ("Bb:min9/Db", False),
        ("C", True),  # theory infers a triad, but the wire symbol is ambiguous
        ("F#", True),
        ("N", True),
        ("garbage", True),
    ],
)
def test_single_note_risk_requires_an_explicit_parseable_chord(symbol, expected):
    assert is_single_note_risk(symbol) is expected


def test_progression_metrics_cover_sonifiability_theory_cadence_and_repetition():
    metrics = progression_metrics(
        ["C:maj", "G:7", "C:maj", "C", "N"], key="C:maj"
    )

    assert metrics["chord_count"] == 5
    assert metrics["valid_chord_count"] == 4
    assert metrics["invalid_symbol_rate"] == pytest.approx(0.2)
    assert metrics["explicit_chord_symbol_rate"] == pytest.approx(0.6)
    assert metrics["sonifiable_proxy_rate"] == pytest.approx(0.6)
    assert metrics["single_note_risk_rate"] == pytest.approx(0.4)
    assert metrics["harmonic_note_count_mean"] == pytest.approx(2.6)
    assert metrics["harmonic_note_count_min"] == 0
    assert metrics["harmonic_note_count_max"] == 4
    assert metrics["complexity_tier_histogram"] == {
        "0": 3,
        "1": 1,
        "2": 0,
        "3": 0,
        "4": 0,
    }
    assert metrics["complexity_tier_mean"] == pytest.approx(0.25)
    assert metrics["diatonic_rate"] == 1.0
    assert metrics["cadential_transition_count"] == 1
    assert metrics["cadential_transition_rate"] == pytest.approx(1 / 3)
    assert metrics["terminal_cadence"] is False
    assert metrics["tonic_function_ending"] is False
    assert metrics["adjacent_repetition_rate"] == 0.0
    assert metrics["unique_chord_ratio"] == pytest.approx(4 / 5)


@dataclass
class _Result:
    output: str | None
    fallback_used: bool = False
    error: str | None = None


class _SequenceSampler:
    def __init__(self, outputs: list[_Result]) -> None:
        self.outputs = iter(outputs)
        self.inputs: list[str] = []

    def sample(self, raw_input: str) -> _Result:
        self.inputs.append(raw_input)
        return next(self.outputs)


def test_evaluate_sampler_feeds_each_output_forward_and_stops_on_silence():
    sampler = _SequenceSampler(
        [
            _Result("F:maj"),
            _Result("G:7", fallback_used=True, error="pooled fallback"),
            _Result("C:maj"),
            _Result(None, error="no candidates"),
        ]
    )

    batch = evaluate_sampler(
        sampler,
        model="fake",
        complexity=0.5,
        seed=7,
        start_chord="C:maj",
        steps=8,
        key="C:maj",
    )

    assert sampler.inputs == ["C:maj", "F:maj", "G:7", "C:maj"]
    assert batch["progression"] == ["C:maj", "F:maj", "G:7", "C:maj"]
    assert batch["requested_steps"] == 8
    assert batch["generated_steps"] == 3
    assert batch["fallback_count"] == 1
    assert batch["fallback_rate"] == pytest.approx(1 / 3)
    assert batch["errors"] == ["pooled fallback", "no candidates"]
    assert batch["metrics"]["terminal_cadence"] is True
    assert batch["metrics"]["single_note_risk_rate"] == 0.0


def test_aggregate_batches_groups_runs_and_excludes_unavailable_models():
    sampler_a = _SequenceSampler([_Result("G:7"), _Result("C:maj")])
    sampler_b = _SequenceSampler([_Result("F:maj"), _Result("C:maj")])
    first = evaluate_sampler(
        sampler_a,
        model="markov",
        complexity=0.0,
        seed=1,
        start_chord="C:maj",
        steps=2,
        key="C:maj",
    )
    second = evaluate_sampler(
        sampler_b,
        model="markov",
        complexity=0.0,
        seed=2,
        start_chord="C:maj",
        steps=2,
        key="C:maj",
    )
    unavailable = {
        "available": False,
        "model": "lstm",
        "complexity": 0.0,
        "seed": 1,
        "error": "missing weights",
    }

    aggregate = aggregate_batches([first, second, unavailable])

    assert len(aggregate) == 1
    assert aggregate[0]["model"] == "markov"
    assert aggregate[0]["batch_count"] == 2
    assert aggregate[0]["sonifiable_proxy_rate"] == 1.0
    assert aggregate[0]["terminal_cadence_rate"] == 0.5
    assert aggregate[0]["complexity_tier_histogram"]["0"] == 5
    assert aggregate[0]["complexity_tier_histogram"]["1"] == 1
