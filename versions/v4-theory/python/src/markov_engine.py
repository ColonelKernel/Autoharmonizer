"""Weighted Markov sampling: legacy single-table + multi-corpus Spice blend.

Two modes share one ``sample()`` entry point:

* **Blend mode** (a ``CorporaSet`` is supplied): the input chord is transposed
  into normalized (C/Am) key space, the Color dial mixes the per-corpus
  distributions, the Adventure dial tempers the result, one target is sampled,
  and it is transposed back into the current key. See ``src/blend.py``.
* **Legacy mode** (only a single ``TransitionTable``): the original v1 behavior
  — opaque absolute chord labels, no blending — preserved for backward
  compatibility and the ``markov_openbook.csv`` smoke path.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Callable

from . import blend
from .chord_vocab import parse_key, transpose_chord
from .config import (
    DEFAULT_ADVENTURE,
    DEFAULT_COLOR,
    DEFAULT_FALLBACK,
    DEFAULT_GRAVITY,
    DEFAULT_KEY,
)
from .corpus_loader import CorporaSet
from .csv_loader import TransitionTable


@dataclass(frozen=True)
class SampleResult:
    output: str | None
    probability: float | None
    candidates: int
    fallback_used: bool
    error: str | None = None
    mix: str | None = None  # effective corpus weights (blend mode, for debug)


class MarkovEngine:
    def __init__(
        self,
        table: TransitionTable | None = None,
        *,
        corpora: CorporaSet | None = None,
        fallback: str = DEFAULT_FALLBACK,
        seed: int | None = None,
        color: float = DEFAULT_COLOR,
        adventure: float = DEFAULT_ADVENTURE,
        key: str = DEFAULT_KEY,
        gravity: float = DEFAULT_GRAVITY,
    ) -> None:
        self._table = table
        self._corpora = corpora
        self._fallback = fallback
        self._rng = random.Random(seed)
        self._color = color
        self._adventure = adventure
        self._key = key or DEFAULT_KEY
        self._gravity = gravity
        self._model = "markov"  # active backend; rnn/lstm not yet implemented

    def set_model(self, name: str) -> bool:
        """Select the generative backend. Returns True if it is available.

        Only ``markov`` is implemented today; ``rnn``/``lstm`` are accepted so
        the Max selector is wired end-to-end, but sampling stays on Markov and
        the caller reports them as unavailable.
        """
        self._model = name
        return name == "markov"

    # --- performable dial setters (called from the OSC control handlers) ---
    def set_color(self, value: float) -> None:
        self._color = float(value)

    def set_adventure(self, value: float) -> None:
        self._adventure = float(value)

    def set_spice(self, value: float) -> None:
        """Macro: one dial drives both Color and Adventure together."""
        self._color = float(value)
        self._adventure = float(value)

    def set_key(self, value: str) -> None:
        self._key = value.strip() or DEFAULT_KEY

    def set_gravity(self, value: float) -> None:
        """Cadence pull 0..1 toward the tonic/dominant (0 = no bias)."""
        self._gravity = float(value)

    # --- sampling ---------------------------------------------------------
    def sample(
        self,
        raw_input: str,
        *,
        candidate_selector: Callable[[str, list[tuple[str, float]], str], tuple[str, float]] | None = None,
    ) -> SampleResult:
        chord = raw_input.strip()
        if not chord:
            return SampleResult(None, None, 0, False, error="empty chord input")

        if self._corpora is not None:
            return self._blend_sample(chord, candidate_selector)
        return self._legacy_sample(chord, candidate_selector)

    def _choose(
        self,
        source: str,
        choices: list[tuple[str, float]],
        candidate_selector=None,
    ) -> tuple[str, float]:
        if candidate_selector is not None:
            return candidate_selector(source, choices, "markov")
        targets = [t for t, _ in choices]
        probs = [p for _, p in choices]
        chosen = self._rng.choices(targets, weights=probs, k=1)[0]
        return chosen, probs[targets.index(chosen)]

    def _blend_sample(self, chord: str, candidate_selector=None) -> SampleResult:
        norm_in, offset = blend.normalize_to_key(chord, self._key)
        weights = blend.color_weights(self._color, available=self._corpora.names())
        tau = blend.temperature(self._adventure)
        _, mode = parse_key(self._key)
        mix = " ".join(f"{n}:{w:.2f}" for n, w in sorted(weights.items()))

        choices = blend.blended_choices(
            self._corpora, weights, tau, norm_in, mode, self._gravity
        )
        if choices:
            runtime_choices = [(transpose_chord(target, -offset), prob) for target, prob in choices]
            chosen, prob = self._choose(chord, runtime_choices, candidate_selector)
            return SampleResult(
                output=chosen,
                probability=prob,
                candidates=len(choices),
                fallback_used=False,
                mix=mix,
            )
        return self._blend_fallback(chord, norm_in, offset, tau, mix, candidate_selector)

    def _blend_fallback(
        self, chord: str, norm_in: str, offset: int, tau: float, mix: str,
        candidate_selector=None,
    ) -> SampleResult:
        error = f"unknown chord: {chord}"

        # 1) Try the pooled "all" corpus so we stay musical when the source
        #    chord simply isn't in the current color window.
        pooled = self._corpora.corpora.get("all")
        if pooled is not None:
            dist = pooled.dist_by_source.get(norm_in)
            if dist:
                _, mode = parse_key(self._key)
                choices = blend._apply_cadence(
                    blend._apply_temperature(dist, tau), mode, self._gravity
                )
                runtime_choices = [(transpose_chord(target, -offset), prob) for target, prob in choices]
                chosen, prob = self._choose(chord, runtime_choices, candidate_selector)
                return SampleResult(
                    output=chosen,
                    probability=prob,
                    candidates=len(choices),
                    fallback_used=True,
                    error=error,
                    mix=mix + " +all",
                )

        # 2) Configured fallback policy.
        policy = self._fallback
        if policy == "error_only":
            return SampleResult(None, None, 0, True, error=error, mix=mix)
        if policy == "echo_input":
            return SampleResult(chord, None, 0, True, error=error, mix=mix)
        if policy == "global_top" and self._corpora.global_fallback:
            top_norm = self._corpora.global_fallback[0][0]
            return SampleResult(
                transpose_chord(top_norm, -offset), None, 0, True, error=error, mix=mix
            )
        if policy == "random_source":
            pooled = self._corpora.corpora.get("all")
            sources = list(pooled.dist_by_source) if pooled else []
            if sources:
                src = self._rng.choice(sources)
                choices = blend._apply_temperature(pooled.dist_by_source[src], tau)
                runtime_choices = [(transpose_chord(target, -offset), prob) for target, prob in choices]
                chosen, prob = self._choose(chord, runtime_choices, candidate_selector)
                return SampleResult(
                    chosen,
                    prob,
                    len(choices),
                    True,
                    error=error,
                    mix=mix,
                )
        # Safe default: echo the input chord.
        return SampleResult(chord, None, 0, True, error=error, mix=mix)

    # --- legacy single-table path (v1) ------------------------------------
    def _legacy_sample(self, chord: str, candidate_selector=None) -> SampleResult:
        weights = self._table.weighted_choices_by_source.get(chord)
        if weights:
            chosen, prob = self._choose(chord, weights, candidate_selector)
            return SampleResult(chosen, prob, len(weights), False)
        return self._apply_fallback(chord)

    def _apply_fallback(self, chord: str) -> SampleResult:
        policy = self._fallback
        error = f"unknown chord: {chord}"

        if policy == "error_only":
            return SampleResult(None, None, 0, True, error=error)
        if policy == "echo_input":
            return SampleResult(chord, None, 0, True, error=error)
        if policy == "global_top":
            top_chord = self._table.global_fallback_pool[0][0]
            return SampleResult(top_chord, None, 0, True, error=error)
        if policy == "random_source":
            source = self._rng.choice(list(self._table.weighted_choices_by_source.keys()))
            chosen, prob = self._choose(
                chord, self._table.weighted_choices_by_source[source]
            )
            return SampleResult(chosen, prob, len(self._table.weighted_choices_by_source[source]), True, error=error)

        raise ValueError(f"Unsupported fallback policy: {policy}")
