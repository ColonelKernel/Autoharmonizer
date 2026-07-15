"""Variable-order chord n-gram trained from the local JazzNet sequences."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path
from typing import Callable

from ..harmony.theory import parse_chord, reduce_for_neural
from .base import SampleResult

CandidateSelector = Callable[[str, list[tuple[str, float]], str], tuple[str, float]]


class NgramModelError(RuntimeError):
    pass


class NgramEngine:
    """Back-off n-gram with a small stateful chord history.

    This complements Markov order 1 and recurrent neural models: it remembers
    exact 2–4 chord cells, making turnarounds and ii–V–I patterns more stable,
    while remaining inspectable and fast enough to run at Max startup.
    """

    name = "ngram"

    def __init__(
        self,
        model_path: str | Path,
        *,
        fallback: str = "echo_input",
        seed: int | None = None,
        temperature: float = 1.0,
    ) -> None:
        path = Path(model_path)
        try:
            model = json.loads(path.read_text())
        except (OSError, ValueError) as exc:
            raise NgramModelError(f"cannot load n-gram model {path}: {exc}") from exc
        if model.get("version") != 1:
            raise NgramModelError(
                f"unsupported n-gram schema version: {model.get('version')!r}"
            )
        if not isinstance(model.get("orders"), dict) or not model.get("global"):
            raise NgramModelError(f"n-gram model {path} is missing orders/global")
        self._orders: dict[str, dict[str, list[list]]] = model["orders"]
        self._global: list[list] = model["global"]
        self._max_order = max(1, int(model.get("max_order", 4)))
        self._fallback = fallback
        self._rng = random.Random(seed)
        self._temperature = max(0.05, float(temperature))
        self._history: list[str] = []

    @property
    def history(self) -> tuple[str, ...]:
        return tuple(self._history)

    def reset_session(self) -> None:
        self._history.clear()

    def set_temperature(self, temperature: float) -> None:
        self._temperature = max(0.05, float(temperature))

    def _append(self, chord: str) -> None:
        if not self._history or self._history[-1] != chord:
            self._history.append(chord)
        del self._history[:-self._max_order]

    def _lookup(self) -> list[list]:
        max_n = min(self._max_order, len(self._history))
        for order in range(max_n, 0, -1):
            key = "|".join(self._history[-order:])
            found = self._orders.get(str(order), {}).get(key)
            if found:
                return found
        return self._global

    def _distribution(self, counts: list[list]) -> list[tuple[str, float]]:
        inv_tau = 1.0 / self._temperature
        weighted = [(str(chord), math.pow(max(float(count), 0.0), inv_tau)) for chord, count in counts]
        total = sum(weight for _, weight in weighted)
        if total <= 0:
            return []
        return [(chord, weight / total) for chord, weight in weighted]

    def _choose(self, choices: list[tuple[str, float]]) -> tuple[str, float]:
        symbols = [symbol for symbol, _ in choices]
        weights = [probability for _, probability in choices]
        symbol = self._rng.choices(symbols, weights=weights, k=1)[0]
        return symbol, choices[symbols.index(symbol)][1]

    def sample(
        self,
        raw_input: str,
        *,
        session: bool = True,
        candidate_selector: CandidateSelector | None = None,
    ) -> SampleResult:
        source = reduce_for_neural(raw_input.strip())
        if not source or parse_chord(source) is None:
            return self._apply_fallback(raw_input.strip())
        if not session:
            self.reset_session()
        self._append(source)
        choices = self._distribution(self._lookup())
        if not choices:
            return self._apply_fallback(source)
        try:
            selected = (
                candidate_selector(source, choices, self.name)
                if candidate_selector is not None
                else self._choose(choices)
            )
        except ValueError as exc:
            return SampleResult(None, None, 0, True, error=str(exc))
        output, probability = selected
        self._append(output)
        return SampleResult(output, probability, len(choices), False)

    def _apply_fallback(self, chord: str) -> SampleResult:
        error = f"unknown chord: {chord}"
        if self._fallback == "error_only":
            return SampleResult(None, None, 0, True, error=error)
        if self._fallback == "global_top" and self._global:
            return SampleResult(str(self._global[0][0]), None, 0, True, error=error)
        if self._fallback == "random_source":
            sources = list(self._orders.get("1", {}))
            if sources:
                return SampleResult(self._rng.choice(sources), None, len(sources), True, error=error)
        return SampleResult(chord or None, None, 0, True, error=error)
