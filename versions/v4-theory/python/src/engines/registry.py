"""Model registry: switch between the blend Markov engine and JazzNet RNN/LSTM.

Merged design:

* The ``markov`` slot is the existing corpus-blend ``MarkovEngine``
  (Color/Adventure/Spice/Key/Gravity), built and owned by the OSC service and
  injected here via ``markov_engine`` (swapped on ``/control/reload`` through
  ``set_markov``). It stays stateless.
* ``rnn``/``lstm`` are the JazzNet neural engines, lazily loaded (so Markov-only
  use never imports torch) and driven through a **stateful session** that carries
  the model's hidden state across chord steps, with temperature sampling and
  first-step input exclusion (see ``neural_sampler`` / ``neural_session``). Each
  ``/chord/input`` advances the RNN/LSTM to a genuinely new chord — a progression,
  not a held frame.
* JazzNet's dash-flat spelling (``B-:maj7``) is translated to/from this project's
  spelling (``Bb:maj7``) at the boundary so the Max chord parser can sonify it
  (see ``notation``).

``set_model`` switches the active engine and eagerly loads neural weights,
rolling back to the previous model if a checkpoint (or torch) is unavailable, so
a missing asset never breaks the running Markov path.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import replace
from pathlib import Path

from ..config import (
    ADVENTURE_TAU_MAX,
    ADVENTURE_TAU_MIN,
    DEFAULT_MODEL,
    DEFAULT_NEURAL_EXCLUDE_INPUT,
    DEFAULT_NEURAL_TEMPERATURE,
    DEFAULT_SESSION_AUTO_FEED,
    DEFAULT_SESSION_MAX_STEPS,
    DEFAULT_SESSION_MODE,
    MODELS,
    SESSION_MODES,
)
from ..harmony.planner import HarmonyPlanner
from ..harmony.theory import reduce_for_neural
from .base import SampleResult
from .notation import from_jazznet, to_jazznet

logger = logging.getLogger(__name__)


class EngineRegistry:
    def __init__(
        self,
        *,
        markov_engine,
        jazznet_dir: Path,
        jazznet_epoch: int,
        fallback: str,
        seed: int | None,
        initial_model: str = DEFAULT_MODEL,
        neural_temperature: float = DEFAULT_NEURAL_TEMPERATURE,
        neural_exclude_input: bool = DEFAULT_NEURAL_EXCLUDE_INPUT,
        session_mode: str = DEFAULT_SESSION_MODE,
        session_max_steps: int = DEFAULT_SESSION_MAX_STEPS,
        session_auto_feed: bool = DEFAULT_SESSION_AUTO_FEED,
        ngram_model_path: Path | None = None,
        key: str = "C:maj",
        complexity: float = 0.5,
        gravity: float = 0.0,
    ) -> None:
        self._markov = markov_engine
        self._jazznet_dir = jazznet_dir
        self._jazznet_epoch = jazznet_epoch
        self._fallback = fallback
        self._seed = seed
        self._neural_temperature = neural_temperature
        self._neural_exclude_input = neural_exclude_input
        self._session_mode = session_mode if session_mode in SESSION_MODES else DEFAULT_SESSION_MODE
        self._session_max_steps = session_max_steps
        self._session_auto_feed = session_auto_feed
        self._lock = threading.Lock()
        self._rnn = None   # RnnEngine | None (lazy: importing pulls torch)
        self._lstm = None  # LstmEngine | None
        self._ngram = None
        self._ngram_model_path = ngram_model_path
        self._planner = HarmonyPlanner(
            key=key, complexity=complexity, gravity=gravity, seed=seed
        )
        self._active_name = initial_model if initial_model in MODELS else DEFAULT_MODEL

    # --- markov slot ---------------------------------------------------------

    def set_markov(self, engine) -> None:
        """Swap in a freshly reloaded Markov engine (on /control/reload)."""
        with self._lock:
            self._markov = engine

    @property
    def active_name(self) -> str:
        with self._lock:
            return self._active_name

    @property
    def session_mode(self) -> str:
        with self._lock:
            return self._session_mode

    # --- neural engines (lazy) ----------------------------------------------

    def _get_rnn(self):
        if self._rnn is None:
            from .rnn_engine import RnnEngine  # lazy import (torch)

            self._rnn = RnnEngine(
                self._jazznet_dir,
                epoch=self._jazznet_epoch,
                fallback=self._fallback,
                seed=self._seed,
                temperature=self._neural_temperature,
                exclude_input=self._neural_exclude_input,
                session_max_steps=self._session_max_steps,
                session_auto_feed=self._session_auto_feed,
            )
        return self._rnn

    def _get_lstm(self):
        if self._lstm is None:
            from .lstm_engine import LstmEngine  # lazy import (torch)

            self._lstm = LstmEngine(
                self._jazznet_dir,
                epoch=self._jazznet_epoch,
                fallback=self._fallback,
                seed=self._seed,
                temperature=self._neural_temperature,
                exclude_input=self._neural_exclude_input,
                session_max_steps=self._session_max_steps,
                session_auto_feed=self._session_auto_feed,
            )
        return self._lstm

    def _neural_engine(self, name: str):
        if name == "rnn":
            return self._get_rnn()
        if name == "lstm":
            return self._get_lstm()
        raise ValueError(f"Unknown neural model: {name}")

    def _get_ngram(self):
        if self._ngram is None:
            if self._ngram_model_path is None:
                raise FileNotFoundError("v4 n-gram model path is not configured")
            from .ngram_engine import NgramEngine

            self._ngram = NgramEngine(
                self._ngram_model_path,
                fallback=self._fallback,
                seed=self._seed,
                temperature=self._neural_temperature,
            )
        return self._ngram

    # --- session -------------------------------------------------------------

    def _effective_session(self, model_name: str, session_mode: str) -> bool:
        if model_name == "markov":
            return False
        if session_mode == "stateless":
            return False
        return True  # "auto" or "session" -> stateful for rnn/lstm

    def reset_session(self) -> None:
        if self._rnn is not None:
            self._rnn.reset_session()
        if self._lstm is not None:
            self._lstm.reset_session()
        if self._ngram is not None:
            self._ngram.reset_session()
        logger.info("neural session reset")

    def set_session_mode(self, mode: str) -> tuple[bool, str | None]:
        normalized = mode.strip().lower()
        if normalized == "reset":
            self.reset_session()
            return True, None
        if normalized not in SESSION_MODES:
            return False, f"invalid session mode: {mode}"
        with self._lock:
            self._session_mode = normalized
        if normalized == "stateless":
            self.reset_session()
        logger.info("session mode set to %s", normalized)
        return True, None

    def session_status(self) -> tuple[str, int]:
        """Return effective session label and current step count."""
        with self._lock:
            name = self._active_name
            mode = self._session_mode

        if not self._effective_session(name, mode):
            return "stateless", 0

        if name == "ngram":
            return "session", len(self._get_ngram().history)
        engine = self._neural_engine(name)
        return "session", engine.session.step

    def session_history(self) -> str:
        with self._lock:
            name = self._active_name
        if name == "rnn" and self._rnn is not None:
            return self._rnn.session.history_display()
        if name == "lstm" and self._lstm is not None:
            return self._lstm.session.history_display()
        if name == "ngram" and self._ngram is not None:
            return " → ".join(self._ngram.history)
        return ""

    # --- model switching -----------------------------------------------------

    def set_model(self, name: str) -> tuple[bool, str | None]:
        if name not in MODELS:
            return False, f"invalid model: {name}"

        with self._lock:
            previous = self._active_name
            self._active_name = name

        if name in ("rnn", "lstm"):
            try:
                self._neural_engine(name)._ensure_loaded()  # noqa: SLF001
            except Exception as exc:  # missing checkpoint / torch / bad state
                with self._lock:
                    self._active_name = previous
                return False, f"failed to load {name}: {exc}"
        elif name == "ngram":
            try:
                self._get_ngram()
            except Exception as exc:
                with self._lock:
                    self._active_name = previous
                return False, f"failed to load ngram: {exc}"

        # Fresh context each time a (new) model is selected.
        self.reset_session()
        logger.info("active model set to %s", name)
        return True, None

    # --- live temperature (Adventure / Spice dial) ---------------------------

    def set_neural_temperature_from_dial(self, value: float) -> None:
        """Map an Adventure/Spice dial (0..1) to a JazzNet softmax temperature and
        push it to any loaded neural engine, so the same dial that spices the
        Markov blend also widens/sharpens RNN/LSTM sampling.

        0.5 maps to the neutral default (1.5); 0 -> safe (0.6), 1 -> wild (2.4).
        Only affects already-loaded engines; a model loaded later starts from the
        configured ``--neural-temperature`` and follows the dial from there.
        """
        try:
            v = float(value)
        except (TypeError, ValueError):
            return
        v = 0.0 if v < 0 else 1.0 if v > 1 else v
        # 0 -> ADVENTURE_TAU_MIN, 0.5 -> ~1.5, 1 -> ADVENTURE_TAU_MIN + 1.8
        temperature = ADVENTURE_TAU_MIN + v * (ADVENTURE_TAU_MAX + 0.6 - ADVENTURE_TAU_MIN)
        with self._lock:
            self._neural_temperature = temperature
            rnn, lstm, ngram = self._rnn, self._lstm, self._ngram
        for engine in (rnn, lstm, ngram):
            if engine is not None:
                engine.set_temperature(temperature)
        logger.debug("neural temperature <- dial %.3f -> %.3f", v, temperature)

    # --- shared theory controls ---------------------------------------------

    @property
    def complexity(self) -> float:
        return self._planner.complexity

    def set_key(self, value: str) -> None:
        self._planner.set_key(value)
        self._markov.set_key(value)

    def set_gravity(self, value: float) -> None:
        self._planner.set_gravity(value)
        self._markov.set_gravity(value)

    def set_complexity(self, value: float) -> None:
        self._planner.set_complexity(value)

    def _select_runtime(
        self, source: str, choices: list[tuple[str, float]], model_name: str
    ) -> tuple[str, float]:
        return self._planner.choose(source, choices, model_name)

    def _select_neural(
        self, source: str, choices: list[tuple[str, float]], model_name: str
    ) -> tuple[str, float]:
        runtime = [(from_jazznet(symbol), probability) for symbol, probability in choices]
        selected, probability = self._planner.choose(
            from_jazznet(source), runtime, model_name
        )
        for symbol, _ in choices:
            if from_jazznet(symbol) == selected:
                return symbol, probability
        raise ValueError(f"planner selected token outside {model_name} vocabulary: {selected}")

    # --- sampling ------------------------------------------------------------

    def sample(self, raw_input: str) -> SampleResult:
        with self._lock:
            name = self._active_name
            mode = self._session_mode
            markov = self._markov

        if name == "markov":
            result = markov.sample(raw_input, candidate_selector=self._select_runtime)
            if result.output is not None and not result.fallback_used:
                result = replace(result, output=self._planner.realize(result.output))
            return result

        if name == "ngram":
            session = self._effective_session(name, mode)
            result = self._get_ngram().sample(
                raw_input, session=session, candidate_selector=self._select_runtime
            )
            if result.output is not None and not result.fallback_used:
                result = replace(result, output=self._planner.realize(result.output))
            return result

        session = self._effective_session(name, mode)
        try:
            structural_input = reduce_for_neural(raw_input.strip())
            result = self._neural_engine(name).sample(
                to_jazznet(structural_input),
                session=session,
                candidate_selector=self._select_neural,
            )
        except Exception as exc:  # noqa: BLE001 — a malformed token must never
            # crash the OSC handler (which would take down the Python service).
            logger.exception("neural sample failed for %r", raw_input)
            return SampleResult(None, None, 0, True, error=f"{name} sample failed: {exc}")
        if result.output is not None:
            runtime_output = from_jazznet(result.output)
            result = replace(result, output=self._planner.realize(runtime_output))
        return result
