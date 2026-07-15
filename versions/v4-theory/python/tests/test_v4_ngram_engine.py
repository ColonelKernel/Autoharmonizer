"""Variable-order n-gram engine tests using a tiny count model."""

from __future__ import annotations

import json

import pytest

from src.engines.ngram_engine import NgramEngine


@pytest.fixture
def model_path(tmp_path):
    """A model where C -> F establishes a distinctive order-2 context."""
    model = {
        "version": 1,
        "max_order": 4,
        "orders": {
            "1": {
                "C:maj": [["G:7", 3], ["F:maj", 1]],
                "F:maj": [["C:maj", 8], ["D:min", 2]],
                "G:7": [["C:maj", 1]],
            },
            "2": {
                "C:maj|F:maj": [["G:7", 9], ["A:min", 1]],
            },
        },
        "global": [["C:maj", 10], ["G:7", 5], ["F:maj", 1]],
    }
    path = tmp_path / "ngram.json"
    path.write_text(json.dumps(model), encoding="utf-8")
    return path


def _as_dict(choices):
    return {symbol: probability for symbol, probability in choices}


def test_selector_receives_normalized_choices_and_model_name(model_path):
    calls = []

    def select(source, choices, model_name):
        calls.append((source, choices, model_name))
        return next(choice for choice in choices if choice[0] == "F:maj")

    engine = NgramEngine(model_path, fallback="echo_input", seed=3)
    result = engine.sample("C:maj", candidate_selector=select)

    assert result.output == "F:maj"
    assert result.probability == pytest.approx(0.25)
    assert result.candidates == 2
    assert result.fallback_used is False
    assert len(calls) == 1
    source, choices, model_name = calls[0]
    assert source == "C:maj"
    assert model_name == "ngram"
    assert _as_dict(choices) == pytest.approx({"G:7": 0.75, "F:maj": 0.25})


def test_engine_uses_the_longest_available_context(model_path):
    seen = []

    def choose_f(source, choices, model_name):
        return next(choice for choice in choices if choice[0] == "F:maj")

    def choose_top(source, choices, model_name):
        seen.append(_as_dict(choices))
        return max(choices, key=lambda choice: choice[1])

    engine = NgramEngine(model_path, fallback="echo_input", seed=5)
    assert engine.sample("C:maj", candidate_selector=choose_f).output == "F:maj"
    result = engine.sample("F:maj", candidate_selector=choose_top)

    # If the engine used only order 1, C:maj would win 80/20.  The remembered
    # C:maj|F:maj context instead predicts G:7 at 90/10.
    assert result.output == "G:7"
    assert seen[-1] == pytest.approx({"G:7": 0.9, "A:min": 0.1})


def test_echo_fallback_does_not_call_selector(model_path):
    called = False

    def select(*_args):
        nonlocal called
        called = True
        raise AssertionError("selector must not run for echo fallback")

    engine = NgramEngine(model_path, fallback="echo_input", seed=8)
    result = engine.sample("X:unknown", candidate_selector=select)

    assert result.output == "X:unknown"
    assert result.fallback_used is True
    assert result.error == "unknown chord: X:unknown"
    assert called is False


def test_same_seed_reproduces_unassisted_sampling(model_path):
    a = NgramEngine(model_path, fallback="echo_input", seed=31)
    b = NgramEngine(model_path, fallback="echo_input", seed=31)

    seq_a = [a.sample("C:maj").output for _ in range(20)]
    seq_b = [b.sample("C:maj").output for _ in range(20)]

    assert seq_a == seq_b


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {
            "version": 999,
            "max_order": 1,
            "orders": {"1": {"C:maj": [["G:7", 1]]}},
            "global": [["C:maj", 1]],
        },
        {"version": 1, "max_order": 1, "orders": [], "global": [["C:maj", 1]]},
    ],
)
def test_malformed_or_unsupported_model_is_rejected(tmp_path, payload):
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises((ValueError, RuntimeError)):
        NgramEngine(path, seed=1)
