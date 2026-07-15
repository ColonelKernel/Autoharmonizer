"""Theory-aware candidate reranking and surface realization for v4."""

from __future__ import annotations

import math
import random

from ..chord_vocab import CANON_ROOT
from .theory import (
    Chord,
    chord_complexity_tier,
    complexity_level,
    diatonic_quality,
    harmonic_function,
    nearest_scale_root,
    parse_chord,
)

Candidate = tuple[str, float]


class HarmonyPlanner:
    """Choose among model proposals, then render the selected harmony.

    Candidate probability remains the main signal.  Complexity masks and
    reranks the full distribution; functional voice-leading provides a small
    tie-breaker.  Surface realization happens *after* selection so a neural
    session commits exactly the token whose hidden-state proposal was scored.
    """

    def __init__(
        self,
        *,
        key: str = "C:maj",
        complexity: float = 0.5,
        gravity: float = 0.0,
        seed: int | None = None,
    ) -> None:
        self.key = key
        self.complexity = self._clamp(complexity)
        self.gravity = self._clamp(gravity)
        self._rng = random.Random(seed)

    @staticmethod
    def _clamp(value: float) -> float:
        try:
            return max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError):
            return 0.0

    @property
    def level(self) -> int:
        return complexity_level(self.complexity)

    def set_key(self, value: str) -> None:
        self.key = value.strip() or "C:maj"

    def set_complexity(self, value: float) -> None:
        self.complexity = self._clamp(value)

    def set_gravity(self, value: float) -> None:
        self.gravity = self._clamp(value)

    def _function_bonus(self, source: str, target: str) -> float:
        a = harmonic_function(source, self.key)
        b = harmonic_function(target, self.key)
        bonus = {
            ("T", "PD"): 0.18,
            ("PD", "D"): 0.28,
            ("D", "T"): 0.38 + 0.75 * self.gravity,
            ("T", "D"): 0.08,
        }.get((a, b), 0.0)
        if a == b == "C":
            bonus -= 0.12
        return bonus

    def choose(self, source: str, choices: list[Candidate], model_name: str = "model") -> Candidate:
        """Sample once from the model distribution after theory reranking."""
        valid = [(symbol, max(0.0, float(prob))) for symbol, prob in choices if parse_chord(symbol)]
        if not valid:
            if not choices:
                raise ValueError(f"{model_name} produced no chord candidates")
            valid = [(symbol, max(0.0, float(prob))) for symbol, prob in choices]

        level = self.level
        permitted = [item for item in valid if chord_complexity_tier(item[0], self.key) <= level]
        # Deterministic relaxation: use the least-complex proposals rather than
        # returning silence when a model has no token in the requested tier.
        if not permitted:
            minimum = min(chord_complexity_tier(symbol, self.key) for symbol, _ in valid)
            permitted = [item for item in valid if chord_complexity_tier(item[0], self.key) == minimum]

        target = self.complexity * 4.0
        weighted: list[tuple[str, float, float]] = []
        for symbol, probability in permitted:
            tier = chord_complexity_tier(symbol, self.key)
            # Model likelihood dominates; this bounded factor nudges candidates
            # toward the chosen tier without inventing transitions.
            proximity = math.exp(-0.45 * abs(tier - target))
            functional = math.exp(self._function_bonus(source, symbol))
            weight = max(probability, 1e-12) * proximity * functional
            weighted.append((symbol, probability, weight))

        total = sum(weight for _, _, weight in weighted)
        if total <= 0:
            return max(permitted, key=lambda item: item[1])
        pick = self._rng.random() * total
        acc = 0.0
        for symbol, probability, weight in weighted:
            acc += weight
            if pick <= acc:
                return symbol, probability
        symbol, probability, _ = weighted[-1]
        return symbol, probability

    def realize(self, symbol: str) -> str:
        """Turn the chosen structural token into the audible v4 chord symbol."""
        chord = parse_chord(symbol)
        if chord is None:
            return symbol
        level = self.level

        if level <= 1:
            root = chord.root_pc
            quality = diatonic_quality(root, self.key, seventh=level == 1)
            if quality is None:
                root = nearest_scale_root(root, self.key)
                quality = diatonic_quality(root, self.key, seventh=level == 1) or ("maj7" if level else "maj")
            # Tier 1 exposes inversion as a controlled structural device.  It
            # is deterministic for a fixed seed and leaves roughly half root-position.
            bass = None
            if level == 1 and self._rng.random() < 0.35:
                intervals = {"maj7": 4, "min7": 3, "7": 4, "hdim7": 3, "dim7": 3}
                bass = (root + intervals.get(quality, 3)) % 12
            return Chord(root, quality, bass).symbol()

        if level == 2:
            # This is the compatibility tier: retain the learned token exactly.
            return chord.symbol()

        q = chord.quality
        fn = harmonic_function(chord, self.key)
        if level == 3:
            if fn == "D" or q == "7":
                q = "13" if self._rng.random() < 0.5 else "9"
            elif q.startswith("min"):
                q = "min11" if self._rng.random() < 0.35 else "min9"
            else:
                q = "maj7#11" if fn == "PD" else "maj9"
            return Chord(chord.root_pc, q, chord.bass_pc).symbol()

        # Tier 4: altered dominants, upper structures, and occasional tritone
        # substitution.  The selected model token is still what neural state
        # commits; this is an explicitly audible realization layer.
        root = chord.root_pc
        if fn == "D" or q == "7":
            if self._rng.random() < 0.22:
                root = (root + 6) % 12
                q = "13#11"
            else:
                q = self._rng.choice(("7b9", "7#9", "7#11", "7b13"))
        elif q.startswith("min"):
            q = self._rng.choice(("min11", "min13"))
        else:
            q = self._rng.choice(("maj7#11", "maj13"))
        return Chord(root, q, chord.bass_pc).symbol()
