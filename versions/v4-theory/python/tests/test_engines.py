"""Tests for the model registry + JazzNet engine integration."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.config import repo_root
from src.corpus_loader import load_corpora
from src.csv_loader import load_transition_table
from src.engines import EngineRegistry
from src.engines.notation import from_jazznet, to_jazznet
from src.markov_engine import MarkovEngine

ROOT = repo_root()
JAZZNET = ROOT / "data" / "jazznet"
RNN_CKPT = JAZZNET / "checkpoints" / "rnn" / "baselineRNN-epoch35.pt"
LSTM_CKPT = JAZZNET / "checkpoints" / "lstm" / "ChordLSTM-epoch35.pt"


def _make_registry(seed=1):
    table = load_transition_table(ROOT / "data" / "markov_openbook.csv")
    corpora = load_corpora(ROOT / "data" / "markov_corpora_t.json")
    markov = MarkovEngine(table, corpora=corpora, color=1.0, adventure=0.5, key="C:maj", seed=seed)
    return EngineRegistry(
        markov_engine=markov, jazznet_dir=JAZZNET, jazznet_epoch=35,
        fallback="echo_input", seed=seed,
    )


# --- notation adapter --------------------------------------------------------

@pytest.mark.parametrize("ours,jazz", [
    ("Bb:maj7", "B-:maj7"), ("Db:7", "D-:7"), ("Ab:min7", "A-:min7"),
    ("Eb:maj", "E-:maj"), ("F#:min7", "F#:min7"), ("C:maj", "C:maj"),
])
def test_notation_round_trip(ours, jazz):
    assert to_jazznet(ours) == jazz
    assert from_jazznet(jazz) == ours
    assert from_jazznet(to_jazznet(ours)) == ours


# --- registry (no weights needed) --------------------------------------------

def test_markov_is_default_and_samples():
    reg = _make_registry()
    assert reg.active_name == "markov"
    assert reg.sample("D:min7").output  # blend markov still works via registry


def test_invalid_model_rejected():
    reg = _make_registry()
    ok, err = reg.set_model("transformer")
    assert not ok and "invalid model" in err
    assert reg.active_name == "markov"  # unchanged


def test_missing_checkpoint_rolls_back(tmp_path):
    # Point at an empty jazznet dir -> rnn load fails -> stays on markov.
    table = load_transition_table(ROOT / "data" / "markov_openbook.csv")
    markov = MarkovEngine(table, seed=1)
    reg = EngineRegistry(
        markov_engine=markov, jazznet_dir=tmp_path, jazznet_epoch=35,
        fallback="echo_input", seed=1,
    )
    ok, err = reg.set_model("rnn")
    assert not ok and "failed to load rnn" in err
    assert reg.active_name == "markov"
    assert reg.sample("C:maj").output  # still generating on markov


# --- neural engines (require fetched weights) ---------------------------------

requires_weights = pytest.mark.skipif(
    not (RNN_CKPT.is_file() and LSTM_CKPT.is_file()),
    reason="JazzNet checkpoints not fetched (run scripts/fetch_jazznet_assets.py)",
)


@requires_weights
@pytest.mark.parametrize("model", ["rnn", "lstm"])
def test_neural_generates_progression(model):
    import torch

    torch.manual_seed(0)
    reg = _make_registry()
    ok, err = reg.set_model(model)
    assert ok, err

    seen = set()
    cur = "C:maj"
    for _ in range(12):
        out = reg.sample(cur).output
        assert out, "neural engine returned no output"
        # notation must be converted back out of JazzNet's dash spelling
        assert "-:" not in out, f"JazzNet spelling leaked: {out}"
        assert ":" in out
        seen.add(out)
        cur = out
    # a stateful walk should visit more than one chord (not a static echo)
    assert len(seen) >= 3, f"{model} looks stuck: {seen}"


@requires_weights
@pytest.mark.parametrize("bad", ["", "   ", "x", "1", "?"])
def test_neural_bad_input_never_crashes(bad):
    # Empty/whitespace/malformed input must yield a result (error or fallback),
    # never an uncaught IndexError through the OSC handler.
    reg = _make_registry()
    assert reg.set_model("rnn")[0]
    result = reg.sample(bad)  # must not raise
    assert result is not None
    if not bad.strip():
        assert result.error == "empty chord input" and result.output is None
