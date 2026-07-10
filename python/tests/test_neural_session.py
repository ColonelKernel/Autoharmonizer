"""Stateful neural session behavior in the merged registry (the AH modification).

These exercise the RNN/LSTM hidden-state session carried across chord steps:
temperature sampling + first-step input exclusion + step counting + session-mode
control, all behind the corpus-blend Markov registry. Requires JazzNet weights.
"""

from __future__ import annotations

import pytest

from src.config import repo_root
from src.corpus_loader import load_corpora
from src.csv_loader import load_transition_table
from src.engines import EngineRegistry
from src.markov_engine import MarkovEngine

ROOT = repo_root()
JAZZNET = ROOT / "data" / "jazznet"
RNN_CKPT = JAZZNET / "checkpoints" / "rnn" / "baselineRNN-epoch35.pt"
LSTM_CKPT = JAZZNET / "checkpoints" / "lstm" / "ChordLSTM-epoch35.pt"

requires_weights = pytest.mark.skipif(
    not (RNN_CKPT.is_file() and LSTM_CKPT.is_file()),
    reason="JazzNet checkpoints not fetched (run scripts/fetch_jazznet_assets.py)",
)


def _registry(seed=3, session_mode="auto"):
    table = load_transition_table(ROOT / "data" / "markov_openbook.csv")
    corpora = load_corpora(ROOT / "data" / "markov_corpora_t.json")
    markov = MarkovEngine(table, corpora=corpora, color=1.0, adventure=0.5, key="C:maj", seed=seed)
    return EngineRegistry(
        markov_engine=markov,
        jazznet_dir=JAZZNET,
        jazznet_epoch=35,
        fallback="echo_input",
        seed=seed,
        session_mode=session_mode,
    )


def test_markov_is_always_stateless():
    reg = _registry()
    assert reg.session_status() == ("stateless", 0)


@requires_weights
@pytest.mark.parametrize("model", ["rnn", "lstm"])
def test_session_steps_advance(model):
    import torch

    torch.manual_seed(0)
    reg = _registry()
    assert reg.set_model(model)[0]

    mode, step = reg.session_status()
    assert mode == "session" and step == 0  # fresh session after switch

    cur = "C:maj"
    for _ in range(6):
        cur = reg.sample(cur).output
        assert cur and "-:" not in cur

    mode, step = reg.session_status()
    assert mode == "session"
    assert step == 6, f"expected 6 user steps, got {step}"
    assert reg.session_history()  # token trace recorded


@requires_weights
def test_stateless_mode_does_not_step():
    reg = _registry()
    assert reg.set_model("rnn")[0]
    ok, err = reg.set_session_mode("stateless")
    assert ok, err
    assert reg.session_status() == ("stateless", 0)

    for _ in range(4):
        assert reg.sample("C:maj").output  # still generates, just single-step
    # stateless sampling must not advance the session step
    assert reg.session_status() == ("stateless", 0)


@requires_weights
def test_session_reset_and_mode_cycle():
    reg = _registry()
    assert reg.set_model("rnn")[0]
    for _ in range(3):
        reg.sample("C:maj")
    assert reg.session_status()[1] == 3

    ok, _ = reg.set_session_mode("reset")
    assert ok
    assert reg.session_status()[1] == 0  # reset zeroed the step count

    # invalid mode rejected, state unchanged
    ok, err = reg.set_session_mode("bogus")
    assert not ok and "invalid session mode" in err


@requires_weights
def test_switching_model_resets_session():
    reg = _registry()
    assert reg.set_model("rnn")[0]
    for _ in range(4):
        reg.sample("C:maj")
    assert reg.session_status()[1] == 4
    # switching to lstm starts a clean session
    assert reg.set_model("lstm")[0]
    assert reg.session_status() == ("session", 0)
