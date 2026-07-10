"""Stateful session tracking for JazzNet RNN/LSTM engines."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class NeuralSessionState:
    """Carries hidden state and token history across chord steps."""

    hidden: Any | None = None
    token_trace: list[str] = field(default_factory=list)
    user_steps: int = 0

    @property
    def step(self) -> int:
        return self.user_steps

    def reset(self) -> None:
        self.hidden = None
        self.token_trace.clear()
        self.user_steps = 0

    def history_display(self) -> str:
        return ",".join(self.token_trace)


def maybe_reset_for_max_steps(session: NeuralSessionState, max_steps: int) -> bool:
    """Silently reset when the user step cap is reached. Returns True if reset."""
    if max_steps <= 0:
        return False
    if session.user_steps >= max_steps:
        logger.debug("session max steps (%s) reached, auto-reset", max_steps)
        session.reset()
        return True
    return False
