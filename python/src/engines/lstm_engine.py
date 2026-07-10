"""JazzNet ChordLSTM chord engine."""

from __future__ import annotations

import json
import logging
import random
from pathlib import Path

import torch

from ..chord_simplifier import ChordSimplifier
from ..config import (
    DEFAULT_FALLBACK,
    DEFAULT_NEURAL_EXCLUDE_INPUT,
    DEFAULT_NEURAL_TEMPERATURE,
    DEFAULT_SESSION_AUTO_FEED,
    DEFAULT_SESSION_MAX_STEPS,
)
from .base import SampleResult
from .jazznet_checkpoint import load_checkpoint_state
from .jazznet_models import ChordLSTM
from .jazznet_vocab import JazzNetVocab, load_vocab
from .neural_sampler import sample_session, sample_stateless
from .neural_session import NeuralSessionState

logger = logging.getLogger(__name__)


class LstmEngine:
    name = "lstm"

    def __init__(
        self,
        jazznet_dir: Path,
        *,
        epoch: int = 35,
        fallback: str = DEFAULT_FALLBACK,
        seed: int | None = None,
        temperature: float = DEFAULT_NEURAL_TEMPERATURE,
        exclude_input: bool = DEFAULT_NEURAL_EXCLUDE_INPUT,
        session_max_steps: int = DEFAULT_SESSION_MAX_STEPS,
        session_auto_feed: bool = DEFAULT_SESSION_AUTO_FEED,
    ) -> None:
        self._jazznet_dir = jazznet_dir
        self._epoch = epoch
        self._fallback = fallback
        self._temperature = temperature
        self._exclude_input = exclude_input
        self._session_max_steps = session_max_steps
        self._session_auto_feed = session_auto_feed
        self._rng = random.Random(seed)
        self._torch_gen = torch.Generator().manual_seed(seed) if seed is not None else None
        self._simplifier = ChordSimplifier()
        self._vocab: JazzNetVocab | None = None
        self._model: ChordLSTM | None = None
        self._device = None
        self._session = NeuralSessionState()

    @property
    def session(self) -> NeuralSessionState:
        return self._session

    def reset_session(self) -> None:
        self._session.reset()

    def set_temperature(self, temperature: float) -> None:
        """Update softmax sampling temperature live (used on the next sample)."""
        self._temperature = max(0.05, float(temperature))

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return

        chords_path = self._jazznet_dir / "chords.json"
        if not chords_path.is_file():
            raise FileNotFoundError(f"JazzNet vocab not found: {chords_path}")

        checkpoint = (
            self._jazznet_dir / "checkpoints" / "lstm" / f"ChordLSTM-epoch{self._epoch}.pt"
        )
        if not checkpoint.is_file():
            raise FileNotFoundError(f"LSTM checkpoint not found: {checkpoint}")

        meta_path = self._jazznet_dir / "metadata.json"
        if meta_path.is_file():
            meta = json.loads(meta_path.read_text())
            hparams = meta.get("hyperparameters", {})
        else:
            hparams = {}

        self._vocab = load_vocab(chords_path)
        embedding_dim = hparams.get("embedding_dim", 48)
        hidden_dim = hparams.get("hidden_dim", 128)
        n_layers = hparams.get("n_layers", 2)
        dropout = hparams.get("dropout", 0.3)

        self._device = torch.device("cpu")
        model = ChordLSTM(
            self._vocab.vocab_size,
            embedding_dim,
            hidden_dim,
            self._vocab.vocab_size,
            n_layers,
            dropout=dropout,
            padding_idx=0,
        )
        state = load_checkpoint_state(checkpoint, self._device)
        model.load_state_dict(state)
        model.eval()
        model.to(self._device)
        self._model = model
        logger.info("loaded LSTM checkpoint epoch=%s from %s", self._epoch, checkpoint)

    def _resolve_chord(self, chord: str) -> tuple[int | None, str | None]:
        assert self._vocab is not None
        idx = self._vocab.chord_index(chord)
        if idx is not None:
            return idx, chord

        simplified = self._simplifier.simplify_chord(chord)
        if simplified == "Invalid/No Chord":
            return None, None

        idx = self._vocab.chord_index(simplified)
        if idx is not None:
            return idx, simplified
        return None, None

    def sample(self, raw_input: str, *, session: bool = False) -> SampleResult:
        chord = raw_input.strip()
        if not chord:
            return SampleResult(
                output=None,
                probability=None,
                candidates=0,
                fallback_used=False,
                error="empty chord input",
            )

        try:
            self._ensure_loaded()
        except (FileNotFoundError, ImportError) as exc:
            return SampleResult(
                output=None,
                probability=None,
                candidates=0,
                fallback_used=True,
                error=f"LSTM engine unavailable: {exc}",
            )

        assert self._vocab is not None and self._model is not None

        idx, _mapped = self._resolve_chord(chord)
        if idx is None:
            return self._apply_fallback(chord)

        common = {
            "model": self._model,
            "vocab": self._vocab,
            "chord": chord,
            "idx": idx,
            "rnn": False,
            "generator": self._torch_gen,
            "temperature": self._temperature,
            "exclude_input": self._exclude_input,
            "apply_fallback": self._apply_fallback,
        }

        if session:
            return sample_session(
                **common,
                session=self._session,
                max_steps=self._session_max_steps,
                auto_feed_output=self._session_auto_feed,
            )
        return sample_stateless(**common)

    def _apply_fallback(self, chord: str) -> SampleResult:
        error = f"unknown chord: {chord}"
        policy = self._fallback

        if policy == "error_only":
            return SampleResult(
                output=None,
                probability=None,
                candidates=0,
                fallback_used=True,
                error=error,
            )
        if policy == "echo_input":
            return SampleResult(
                output=chord,
                probability=None,
                candidates=0,
                fallback_used=True,
                error=error,
            )
        if policy == "global_top":
            assert self._vocab is not None
            for idx, label in sorted(self._vocab.idx_to_chord.items()):
                if label not in {"pad", "<BOS>", "<EOS>"}:
                    return SampleResult(
                        output=label,
                        probability=None,
                        candidates=0,
                        fallback_used=True,
                        error=error,
                    )
        if policy == "random_source":
            assert self._vocab is not None
            choices = [
                label
                for label in self._vocab.chord_to_idx
                if label not in {"pad", "<BOS>", "<EOS>"}
            ]
            return SampleResult(
                output=self._rng.choice(choices),
                probability=None,
                candidates=len(choices),
                fallback_used=True,
                error=error,
            )

        raise ValueError(f"Unsupported fallback policy: {policy}")
