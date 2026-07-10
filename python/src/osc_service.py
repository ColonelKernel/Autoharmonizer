"""OSC server and client for Markov chord service."""

from __future__ import annotations

import logging
import threading
from typing import Callable

from pythonosc.dispatcher import Dispatcher
from pythonosc.osc_server import BlockingOSCUDPServer
from pythonosc.udp_client import SimpleUDPClient

from .config import (
    DEFAULT_GRAVITY,
    OSC_CHORD_INPUT,
    OSC_CHORD_OUTPUT,
    OSC_CONTROL_ADVENTURE,
    OSC_CONTROL_COLOR,
    OSC_CONTROL_GRAVITY,
    OSC_CONTROL_KEY,
    OSC_CONTROL_MODEL,
    OSC_CONTROL_PING,
    OSC_CONTROL_RELOAD,
    OSC_CONTROL_SESSION,
    OSC_CONTROL_SPICE,
    OSC_DEBUG_CANDIDATES,
    OSC_DEBUG_FALLBACK_USED,
    OSC_DEBUG_INPUT_ECHO,
    OSC_DEBUG_MIX,
    OSC_DEBUG_PROBABILITY,
    OSC_ERROR,
    OSC_PHRASE_OUTPUT,
    OSC_PHRASE_REQUEST,
    OSC_STATUS_MODEL,
    OSC_STATUS_PONG,
    OSC_STATUS_READY,
    OSC_STATUS_SESSION,
    Settings,
)
from .corpus_loader import CorporaSet, CorpusLoadError, load_corpora
from .csv_loader import CSVLoadError, TransitionTable, load_transition_table
from .engines import EngineRegistry
from .engines.phrase_engine import PhraseEngine, PhraseModelError
from .markov_engine import MarkovEngine, SampleResult

logger = logging.getLogger(__name__)


class MarkovOscService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._table: TransitionTable | None = None
        self._corpora: CorporaSet | None = None
        self._engine: MarkovEngine | None = None      # the blend Markov engine
        self._registry: EngineRegistry | None = None  # markov / rnn / lstm switch
        self._client = SimpleUDPClient(settings.max_host, settings.max_port)
        self._server: BlockingOSCUDPServer | None = None
        self._server_thread: threading.Thread | None = None
        self._stop_requested = threading.Event()
        self._phrase: PhraseEngine | None = None

    @property
    def settings(self) -> Settings:
        return self._settings

    def load_table(self) -> TransitionTable:
        table = load_transition_table(self._settings.csv_path)

        # Multi-corpus blend is preferred when the corpora JSON is present;
        # the legacy CSV table stays loaded as a fallback for global_top etc.
        corpora: CorporaSet | None = None
        if self._settings.corpora_path is not None:
            corpora = load_corpora(self._settings.corpora_path)

        # Preserve live dial state across a /control/reload (data reload should
        # not snap Color/Adventure/Key back to the startup defaults).
        prev = self._engine
        color = prev._color if prev is not None else self._settings.color
        adventure = prev._adventure if prev is not None else self._settings.adventure
        key = prev._key if prev is not None else self._settings.key
        gravity = prev._gravity if prev is not None else DEFAULT_GRAVITY

        engine = MarkovEngine(
            table,
            corpora=corpora,
            fallback=self._settings.fallback,
            seed=self._settings.seed,
            color=color,
            adventure=adventure,
            key=key,
            gravity=gravity,
        )
        # Build the registry on first load; on reload just swap the Markov engine
        # so the active model + any loaded neural weights are preserved.
        registry = self._registry
        if registry is None:
            registry = EngineRegistry(
                markov_engine=engine,
                jazznet_dir=self._settings.jazznet_dir,
                jazznet_epoch=self._settings.jazznet_epoch,
                fallback=self._settings.fallback,
                seed=self._settings.seed,
                initial_model=self._settings.model,
                neural_temperature=self._settings.neural_temperature,
                neural_exclude_input=self._settings.neural_exclude_input,
                session_mode=self._settings.session_mode,
                session_max_steps=self._settings.session_max_steps,
                session_auto_feed=self._settings.session_auto_feed,
            )
        else:
            registry.set_markov(engine)

        # Phrase generator: an independent object with its own verb, because a
        # phrase is a SEQUENCE of (chord, duration) and SampleResult carries
        # neither. Optional: when its trained model is absent the service still
        # runs, and /phrase/request answers with an error instead of dying.
        phrase: PhraseEngine | None = None
        if self._settings.phrase_model_path is not None:
            try:
                phrase = PhraseEngine(self._settings.phrase_model_path,
                                      seed=self._settings.seed)
            except PhraseModelError as exc:
                logger.warning("phrase model unavailable: %s", exc)

        with self._lock:
            self._table = table
            self._corpora = corpora
            self._engine = engine
            self._registry = registry
            self._phrase = phrase
        if phrase is not None:
            logger.info("Loaded phrase model: %s", self._settings.phrase_model_path)
        else:
            logger.info("No phrase model — /phrase/request unavailable "
                        "(run scripts/build_phrase_model.py)")
        stats = table.stats
        logger.info(
            "Loaded CSV: rows=%s sources=%s merged=%s normalizations=%s path=%s",
            stats.raw_rows,
            stats.source_count,
            stats.duplicates_merged,
            stats.normalizations,
            self._settings.csv_path,
        )
        if corpora is not None:
            logger.info(
                "Loaded corpora: %s (blend mode) path=%s",
                ", ".join(corpora.names()),
                self._settings.corpora_path,
            )
        else:
            logger.info("No corpora JSON found — legacy single-chain mode")
        return table

    def _get_engine(self) -> MarkovEngine:
        with self._lock:
            if self._engine is None:
                raise RuntimeError("Transition table not loaded")
            return self._engine

    def _get_registry(self) -> EngineRegistry:
        with self._lock:
            if self._registry is None:
                raise RuntimeError("Engine registry not loaded")
            return self._registry

    def _send(self, address: str, *args: object) -> None:
        self._client.send_message(address, list(args))

    def _emit_error(self, message: str) -> None:
        logger.warning(message)
        self._send(OSC_ERROR, message)

    def _emit_debug(self, result: SampleResult, input_chord: str) -> None:
        if not self._settings.debug:
            return
        self._send(OSC_DEBUG_INPUT_ECHO, input_chord)
        self._send(OSC_DEBUG_CANDIDATES, result.candidates)
        self._send(OSC_DEBUG_FALLBACK_USED, 1 if result.fallback_used else 0)
        if result.probability is not None:
            self._send(OSC_DEBUG_PROBABILITY, float(result.probability))
        mix = getattr(result, "mix", None)  # neural results have no corpus mix
        if mix is not None:
            self._send(OSC_DEBUG_MIX, mix)

    def _handle_chord_input(self, _address: str, *args: object) -> None:
        if not args:
            self._emit_error("malformed OSC payload: missing chord argument")
            return

        raw = args[0]
        if not isinstance(raw, str):
            self._emit_error("malformed OSC payload: chord must be a string")
            return

        result = self._get_registry().sample(raw)

        if result.error:
            self._emit_error(result.error)

        if result.output is None:
            return

        self._emit_debug(result, raw.strip())
        self._send(OSC_CHORD_OUTPUT, result.output)
        self._emit_session_status()  # live neural session step for the panel readout
        logger.debug("sampled %r -> %r", raw, result.output)

    def _handle_ping(self, _address: str, *_args: object) -> None:
        self._send(OSC_STATUS_PONG, 1)
        self._emit_model_status()
        self._emit_session_status()
        logger.debug("ping -> pong")

    def _emit_model_status(self) -> None:
        """Report the active model (markov / rnn / lstm) to Max."""
        try:
            self._send(OSC_STATUS_MODEL, self._get_registry().active_name)
        except RuntimeError:
            pass  # registry not loaded yet

    def _emit_session_status(self) -> None:
        """Report the neural session mode + step count to Max."""
        try:
            mode, step = self._get_registry().session_status()
        except RuntimeError:
            return  # registry not loaded yet
        self._send(OSC_STATUS_SESSION, mode, step)

    def _control_float(self, address: str, args: tuple, setter) -> None:
        """Shared validation for the 0..1 dial control messages."""
        if not args:
            self._emit_error(f"{address}: missing value")
            return
        try:
            value = float(args[0])
        except (TypeError, ValueError):
            self._emit_error(f"{address}: value must be a number")
            return
        value = 0.0 if value < 0 else 1.0 if value > 1 else value
        setter(self._get_engine(), value)
        logger.debug("%s -> %.3f", address, value)

    def _handle_color(self, address: str, *args: object) -> None:
        self._control_float(address, args, lambda e, v: e.set_color(v))

    def _handle_adventure(self, address: str, *args: object) -> None:
        self._control_float(
            address,
            args,
            lambda e, v: (e.set_adventure(v), self._push_neural_temperature(v)),
        )

    def _handle_gravity(self, address: str, *args: object) -> None:
        self._control_float(address, args, lambda e, v: e.set_gravity(v))

    def _handle_spice(self, address: str, *args: object) -> None:
        self._control_float(
            address,
            args,
            lambda e, v: (e.set_spice(v), self._push_neural_temperature(v)),
        )

    def _push_neural_temperature(self, value: float) -> None:
        """Forward an Adventure/Spice dial value to the neural engines too, so the
        same dial widens/sharpens RNN/LSTM sampling as it spices the Markov blend."""
        try:
            self._get_registry().set_neural_temperature_from_dial(value)
        except RuntimeError:
            pass  # registry not loaded yet

    def _handle_key(self, _address: str, *args: object) -> None:
        if not args or not isinstance(args[0], str) or not args[0].strip():
            self._emit_error(f"{OSC_CONTROL_KEY}: missing/invalid key string")
            return
        self._get_engine().set_key(args[0].strip())
        logger.debug("%s -> %s", OSC_CONTROL_KEY, args[0].strip())

    def _handle_model(self, _address: str, *args: object) -> None:
        if not args or not isinstance(args[0], str) or not args[0].strip():
            self._emit_error(f"{OSC_CONTROL_MODEL}: missing/invalid model name")
            return
        name = args[0].strip().lower()
        ok, err = self._get_registry().set_model(name)
        if ok:
            self._emit_model_status()
            self._emit_session_status()
            logger.info("model -> %s", name)
        else:
            self._emit_error(f"model '{name}' unavailable: {err}")

    def _handle_session(self, _address: str, *args: object) -> None:
        if not args or not isinstance(args[0], str) or not args[0].strip():
            self._emit_error(f"{OSC_CONTROL_SESSION}: missing/invalid session mode")
            return
        mode = args[0].strip().lower()
        ok, err = self._get_registry().set_session_mode(mode)
        if not ok:
            self._emit_error(err or f"failed to set session mode: {mode}")
            return
        self._emit_session_status()
        logger.info("session -> %s", mode)

    def _handle_reload(self, _address: str, *_args: object) -> None:
        try:
            self.load_table()
            self._send(OSC_STATUS_READY, 1)
            self._emit_model_status()
            self._emit_session_status()
            logger.info("CSV reload succeeded")
        except (CSVLoadError, OSError) as exc:
            self._emit_error(f"reload failed: {exc}")
            logger.exception("CSV reload failed")

    def _build_dispatcher(self) -> Dispatcher:
        dispatcher = Dispatcher()
        dispatcher.map(OSC_CHORD_INPUT, self._handle_chord_input)
        dispatcher.map(OSC_CONTROL_PING, self._handle_ping)
        dispatcher.map(OSC_CONTROL_RELOAD, self._handle_reload)
        dispatcher.map(OSC_CONTROL_COLOR, self._handle_color)
        dispatcher.map(OSC_CONTROL_ADVENTURE, self._handle_adventure)
        dispatcher.map(OSC_CONTROL_GRAVITY, self._handle_gravity)
        dispatcher.map(OSC_CONTROL_SPICE, self._handle_spice)
        dispatcher.map(OSC_CONTROL_KEY, self._handle_key)
        dispatcher.map(OSC_CONTROL_MODEL, self._handle_model)
        dispatcher.map(OSC_CONTROL_SESSION, self._handle_session)
        dispatcher.map(OSC_PHRASE_REQUEST, self._handle_phrase_request)
        dispatcher.set_default_handler(self._handle_unknown)
        return dispatcher

    def _handle_unknown(self, address: str, *args: object) -> None:
        self._emit_error(f"unknown OSC address: {address}")

    def _handle_phrase_request(self, _address: str, *args: object) -> None:
        """/phrase/request <key> <bars> [cadence] [seed_chord]
        -> /phrase/output <chord> <dur> <chord> <dur> ...

        Runs on the single OSC server thread, so it must never raise (an
        uncaught exception would take the daemon thread down) and must stay
        fast — generation is sub-millisecond.
        """
        phrase = self._phrase
        if phrase is None:
            self._emit_error("phrase model not loaded; run scripts/build_phrase_model.py")
            return
        try:
            key = str(args[0]) if len(args) > 0 else self._settings.key
            bars = int(args[1]) if len(args) > 1 else 8
            cadence = float(args[2]) if len(args) > 2 else 1.0
            seed_chord = str(args[3]) if len(args) > 3 and args[3] else None
            if not 1 <= bars <= 64:
                raise ValueError(f"bars out of range: {bars}")
            plan = phrase.generate(bars, key, seed_chord=seed_chord, cadence=cadence)
        except (ValueError, TypeError, IndexError) as exc:
            self._emit_error(f"bad /phrase/request {args}: {exc}")
            return
        except Exception as exc:  # never kill the server thread
            logger.exception("phrase generation failed")
            self._emit_error(f"phrase generation failed: {exc}")
            return

        flat: list[object] = []
        for chord, dur in plan:
            flat.append(chord)
            flat.append(int(dur))
        self._send(OSC_PHRASE_OUTPUT, *flat)
        logger.info("phrase %s bars in %s: %s", bars, key,
                    " ".join(f"{c}({d})" for c, d in plan))

    def signal_ready(self) -> None:
        self._send(OSC_STATUS_READY, 1)
        self._emit_model_status()
        self._emit_session_status()
        logger.info("sent /status/ready")

    def start(self) -> None:
        self.load_table()
        dispatcher = self._build_dispatcher()
        self._server = BlockingOSCUDPServer(
            (self._settings.host, self._settings.port),
            dispatcher,
        )
        logger.info(
            "OSC server listening on %s:%s -> Max at %s:%s",
            self._settings.host,
            self._settings.port,
            self._settings.max_host,
            self._settings.max_port,
        )

        self.signal_ready()

        self._server_thread = threading.Thread(
            target=self._server.serve_forever,
            name="osc-server",
            daemon=True,
        )
        self._server_thread.start()

    def stop(self) -> None:
        # Re-entrant: called from a signal-handler thread AND main's finally.
        # Snapshot-then-clear so a concurrent second call sees None instead of
        # racing into shutdown() on a half-torn-down server. The event also
        # records a stop that arrives before serve_forever() has begun.
        self._stop_requested.set()
        server, self._server = self._server, None
        if server is not None:
            server.shutdown()
        thread, self._server_thread = self._server_thread, None
        if thread is not None:
            thread.join(timeout=2.0)

    def run_forever(self, on_started: Callable[[], None] | None = None) -> None:
        self.load_table()
        dispatcher = self._build_dispatcher()
        server = BlockingOSCUDPServer(
            (self._settings.host, self._settings.port),
            dispatcher,
        )
        self._server = server
        logger.info(
            "OSC server listening on %s:%s -> Max at %s:%s",
            self._settings.host,
            self._settings.port,
            self._settings.max_host,
            self._settings.max_port,
        )
        self.signal_ready()
        if on_started:
            on_started()
        if self._stop_requested.is_set():
            return  # SIGTERM landed during startup — don't serve a dead session
        server.serve_forever()


# Backward-compatible alias: the merged service handles Markov + RNN/LSTM.
ChordOscService = MarkovOscService
