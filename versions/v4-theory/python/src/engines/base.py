"""Shared types for chord generation engines."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SampleResult:
    output: str | None
    probability: float | None
    candidates: int
    fallback_used: bool
    error: str | None = None


class ChordEngine(Protocol):
    name: str

    def sample(
        self, raw_input: str, *, session: bool = False, candidate_selector=None
    ) -> SampleResult: ...
