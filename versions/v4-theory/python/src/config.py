"""Configuration and OSC protocol constants for the isolated theory v4.

Merged backend: the corpus-blend Markov service (Color/Adventure/Spice/Key/Gravity)
plus the JazzNet RNN/LSTM neural engines driven through a stateful **session**
(temperature sampling + input exclusion + hidden-state carry). Markov stays
stateless; rnn/lstm run stateful under session mode "auto".
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path

PROTOCOL_VERSION = "v4"

# OSC addresses — keep in sync with PLAN.md and max/markov_osc.js
OSC_CHORD_INPUT = "/chord/input"
OSC_CHORD_OUTPUT = "/chord/output"
OSC_STATUS_READY = "/status/ready"
OSC_STATUS_PONG = "/status/pong"
OSC_STATUS_MODEL = "/status/model"            # string: active model
OSC_STATUS_SESSION = "/status/session"        # string mode + int step
OSC_STATUS_PROTOCOL = "/status/protocol"      # string: "v4"
OSC_STATUS_COMPLEXITY = "/status/complexity"  # float: effective normalized value
OSC_ERROR = "/error"
OSC_CONTROL_PING = "/control/ping"
OSC_CONTROL_RELOAD = "/control/reload"
# Phrase generation (inherited from v3): the SEQUENCE is the unit of analysis.
#   Max -> Py : /phrase/request  <key> <bars> <cadence 0..1> [<seed chord>]
#   Py -> Max : /phrase/output   <chord> <dur_beats> <chord> <dur_beats> ...
# Independent of the single-chord /chord/input verb, which the other devices
# still use; SampleResult has no duration or sequence field to carry a phrase.
OSC_PHRASE_REQUEST = "/phrase/request"
OSC_PHRASE_OUTPUT = "/phrase/output"
# Spice controls (v2): corpus blend + temperature + key for transposition.
OSC_CONTROL_COLOR = "/control/color"          # float 0..1 corpus morph
OSC_CONTROL_ADVENTURE = "/control/adventure"  # float 0..1 temperature
OSC_CONTROL_SPICE = "/control/spice"          # float 0..1 macro -> color & adventure
OSC_CONTROL_KEY = "/control/key"              # string e.g. "C:maj" / "A:min"
OSC_CONTROL_MODEL = "/control/model"          # markov | rnn | lstm | ngram
OSC_CONTROL_GRAVITY = "/control/gravity"      # float 0..1 harmonic gravity (cadence pull)
OSC_CONTROL_COMPLEXITY = "/control/complexity"  # float 0..1 theory tier
# Stateful-engine control (inherited): string auto | stateless | session | reset
OSC_CONTROL_SESSION = "/control/session"

# Generative model backends. N-gram is the v4 inspectable long-context addition.
# MODEL_NAMES is an alias retained for parity with the neural codebase.
MODELS = ("markov", "rnn", "lstm", "ngram")
MODEL_NAMES = MODELS
DEFAULT_MODEL = "markov"
OSC_DEBUG_PROBABILITY = "/debug/probability"
OSC_DEBUG_CANDIDATES = "/debug/candidates"
OSC_DEBUG_INPUT_ECHO = "/debug/input_echo"
OSC_DEBUG_FALLBACK_USED = "/debug/fallback_used"
OSC_DEBUG_MIX = "/debug/mix"                  # string, effective corpus weights
OSC_DEBUG_MODEL = "/debug/model"
OSC_DEBUG_SESSION_HISTORY = "/debug/session_history"

FALLBACK_POLICIES = ("echo_input", "global_top", "random_source", "error_only")
DEFAULT_FALLBACK = "echo_input"

PROB_SUM_TOLERANCE = 0.01

# --- Spice model tuning (see src/blend.py) ------------------------------------
# Ordered single-corpus anchors for the Color dial: 0.0 = plainest (folk) ...
# 1.0 = spiciest (jazz). Reorder to change what the dial morphs through.
COLOR_PATH = ("nottingham", "pop909", "bach", "openbook")
# Adventure -> sampling temperature tau. <1 sharpens toward the likeliest
# chord; >1 flattens the tail so rare, colorful chords surface.
ADVENTURE_TAU_MIN = 0.6
ADVENTURE_TAU_MAX = 1.8
# Dial defaults at startup.
DEFAULT_COLOR = 0.5
DEFAULT_ADVENTURE = 0.35
DEFAULT_KEY = "C:maj"
DEFAULT_COMPLEXITY = 0.5  # compatibility tier: preserves existing model symbols

# --- Cadence / harmonic-gravity bias (see src/blend._apply_cadence) -----------
# Gravity 0 = no bias (pure corpus + temperature); 1 = strong pull toward the
# tonic and, secondarily, the dominant, so progressions resolve instead of
# wandering. Applied in normalized C/Am space, so the tonic/dominant roots are
# fixed per mode (below) regardless of the live key.
DEFAULT_GRAVITY = 0.0
TONIC_PC = {"maj": 0, "min": 9}       # C for major, A for minor
DOMINANT_PC = {"maj": 7, "min": 4}    # G for major, E for minor
# Probability multiplier at gravity=1 is (1 + boost); the tonic pulls hardest.
CADENCE_TONIC_BOOST = 3.0
CADENCE_DOMINANT_BOOST = 1.2

# --- Stateful sampling and session controls -----------------------------------
# Softmax temperature for JazzNet sampling; >1 adds variety, <1 sharpens toward
# the likeliest chord.
DEFAULT_NEURAL_TEMPERATURE = 1.5
# Mask the input chord on the first neural step so a chain transitions to a new
# chord rather than echoing the chord it was handed.
DEFAULT_NEURAL_EXCLUDE_INPUT = True
# Session mode: "auto" -> stateful for rnn/lstm, stateless for markov;
# "stateless" -> single-step everywhere; "session" -> force stateful neural.
SESSION_MODES = ("auto", "stateless", "session")
DEFAULT_SESSION_MODE = "auto"
# Auto-reset a neural session after this many user chord steps.
DEFAULT_SESSION_MAX_STEPS = 64
# Feed the model's own output token back into the hidden state between steps.
DEFAULT_SESSION_AUTO_FEED = True


def repo_root() -> Path:
    """Return project root (directory containing PLAN.md)."""
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / "PLAN.md").exists():
            return parent
    return Path.cwd()


def resolve_csv_path(path: str | Path) -> Path:
    """Resolve CSV path relative to repo root when not found as given."""
    candidate = Path(path)
    if candidate.is_file():
        return candidate.resolve()

    from_root = repo_root() / path
    if from_root.is_file():
        return from_root.resolve()

    raise FileNotFoundError(f"CSV file not found: {path}")


def resolve_optional_path(path: str | Path) -> Path | None:
    """Like resolve_csv_path but returns None instead of raising when missing.

    Used for the corpora JSON: when absent the service degrades to the legacy
    single-CSV chain rather than failing to start.
    """
    candidate = Path(path)
    if candidate.is_file():
        return candidate.resolve()
    from_root = repo_root() / path
    if from_root.is_file():
        return from_root.resolve()
    return None


def resolve_jazznet_dir(path: str | Path) -> Path:
    """Resolve the JazzNet asset directory (may not have checkpoints yet).

    Returns the directory whether or not weights are present — the RNN/LSTM
    engines report a clear error at load time if a checkpoint is missing.
    """
    candidate = Path(path)
    if candidate.is_dir():
        return candidate.resolve()
    from_root = repo_root() / path
    return from_root.resolve()


def _env_bool(name: str) -> bool | None:
    raw = os.environ.get(name)
    if raw is None:
        return None
    return raw.lower() in {"1", "true", "yes", "on"}


def _env_int(name: str) -> int | None:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return None
    return int(raw)


def _env_float(name: str) -> float | None:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return None
    return float(raw)


@dataclass(frozen=True)
class Settings:
    csv_path: Path
    host: str
    port: int
    max_host: str
    max_port: int
    fallback: str
    debug: bool
    seed: int | None
    corpora_path: Path | None = None
    phrase_model_path: Path | None = None
    ngram_model_path: Path | None = None
    color: float = DEFAULT_COLOR
    adventure: float = DEFAULT_ADVENTURE
    key: str = DEFAULT_KEY
    complexity: float = DEFAULT_COMPLEXITY
    gravity: float = DEFAULT_GRAVITY
    model: str = DEFAULT_MODEL
    jazznet_dir: Path | None = None
    jazznet_epoch: int = 35
    # Neural + session settings. Defaulted so existing callers that build
    # Settings without these keep working.
    neural_temperature: float = DEFAULT_NEURAL_TEMPERATURE
    neural_exclude_input: bool = DEFAULT_NEURAL_EXCLUDE_INPUT
    session_mode: str = DEFAULT_SESSION_MODE
    session_max_steps: int = DEFAULT_SESSION_MAX_STEPS
    session_auto_feed: bool = DEFAULT_SESSION_AUTO_FEED


def build_parser() -> argparse.ArgumentParser:
    default_csv = str(repo_root() / "data" / "markov_openbook.csv")
    default_corpora = str(repo_root() / "data" / "markov_corpora_t.json")
    parser = argparse.ArgumentParser(description="Chord generator OSC service (Markov + JazzNet)")
    parser.add_argument("--csv", default=default_csv, help="Legacy single transition CSV")
    parser.add_argument(
        "--corpora",
        default=default_corpora,
        help="Per-corpus transition JSON (enables Color/Adventure blending)",
    )
    parser.add_argument(
        "--ngram-model",
        default=str(repo_root() / "data" / "theory_ngram.json"),
        help="Variable-order v4 chord model JSON",
    )
    parser.add_argument(
        "--phrase-model",
        default=str(repo_root() / "data" / "phrase_model_jazznet.json"),
        help="Trained phrase model JSON (enables /phrase/request)",
    )
    parser.add_argument("--color", type=float, default=DEFAULT_COLOR, help="Color 0..1")
    parser.add_argument(
        "--adventure", type=float, default=DEFAULT_ADVENTURE, help="Adventure 0..1"
    )
    parser.add_argument("--key", default=DEFAULT_KEY, help="Song key, e.g. C:maj / A:min")
    parser.add_argument(
        "--complexity", type=float, default=DEFAULT_COMPLEXITY,
        help="Theory complexity 0..1 (simple diatonic to altered/modulatory)",
    )
    parser.add_argument(
        "--gravity", type=float, default=DEFAULT_GRAVITY,
        help="Functional cadence pull 0..1",
    )
    parser.add_argument("--model", choices=MODELS, default=DEFAULT_MODEL, help="Initial model")
    parser.add_argument(
        "--jazznet-dir",
        default=str(repo_root() / "data" / "jazznet"),
        help="JazzNet asset directory (vocab + checkpoints) for rnn/lstm",
    )
    parser.add_argument("--jazznet-epoch", type=int, default=35, help="JazzNet checkpoint epoch")
    parser.add_argument(
        "--neural-temperature",
        type=float,
        default=DEFAULT_NEURAL_TEMPERATURE,
        help="Softmax temperature for RNN/LSTM sampling (>1 = more variety)",
    )
    parser.add_argument(
        "--neural-exclude-input",
        action=argparse.BooleanOptionalAction,
        default=DEFAULT_NEURAL_EXCLUDE_INPUT,
        help="Mask input chord token when sampling RNN/LSTM (force a transition)",
    )
    parser.add_argument(
        "--session-mode",
        choices=SESSION_MODES,
        default=DEFAULT_SESSION_MODE,
        help="Session mode: auto (session for rnn/lstm), stateless, or session",
    )
    parser.add_argument(
        "--session-max-steps",
        type=int,
        default=DEFAULT_SESSION_MAX_STEPS,
        help="Auto-reset neural session after this many user chord steps",
    )
    parser.add_argument(
        "--session-auto-feed",
        action=argparse.BooleanOptionalAction,
        default=DEFAULT_SESSION_AUTO_FEED,
        help="Auto-feed model output token into session hidden state",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", type=int, default=9100, help="Listen port (v4 isolated default)")
    parser.add_argument("--max-host", default="127.0.0.1", help="Max reply host")
    parser.add_argument("--max-port", type=int, default=9101, help="Max reply port (v4 isolated default)")
    parser.add_argument(
        "--fallback",
        choices=FALLBACK_POLICIES,
        default=DEFAULT_FALLBACK,
        help="Unknown chord fallback policy",
    )
    parser.add_argument("--debug", action="store_true", help="Emit debug OSC messages")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for sampling")
    return parser


def load_settings(argv: list[str] | None = None) -> Settings:
    parser = build_parser()
    args = parser.parse_args(argv)

    csv_path = resolve_csv_path(os.environ.get("MARKOV_CSV", args.csv))
    corpora_path = resolve_optional_path(os.environ.get("MARKOV_CORPORA", args.corpora))
    phrase_model_path = resolve_optional_path(
        os.environ.get("PHRASE_MODEL", args.phrase_model)
    )
    ngram_model_path = resolve_optional_path(
        os.environ.get("NGRAM_MODEL", args.ngram_model)
    )
    color = _env_float("MARKOV_COLOR")
    color = color if color is not None else args.color
    adventure = _env_float("MARKOV_ADVENTURE")
    adventure = adventure if adventure is not None else args.adventure
    key = os.environ.get("MARKOV_KEY", args.key)
    complexity_env = _env_float("HARMONY_COMPLEXITY")
    complexity = complexity_env if complexity_env is not None else args.complexity
    complexity = max(0.0, min(1.0, complexity))
    gravity_env = _env_float("MARKOV_GRAVITY")
    gravity = gravity_env if gravity_env is not None else args.gravity
    gravity = max(0.0, min(1.0, gravity))
    # CHORD_MODEL is the v3 name; MARKOV_MODEL kept as a backward-compatible alias.
    model = os.environ.get("CHORD_MODEL", os.environ.get("MARKOV_MODEL", args.model))
    if model not in MODELS:
        raise ValueError(f"Invalid model: {model}")
    jazznet_dir = resolve_jazznet_dir(os.environ.get("JAZZNET_DIR", args.jazznet_dir))
    _epoch_env = _env_int("JAZZNET_EPOCH")  # explicit None-check so epoch 0 is honored
    jazznet_epoch = _epoch_env if _epoch_env is not None else args.jazznet_epoch
    host = os.environ.get("MARKOV_HOST", args.host)
    port = _env_int("MARKOV_PORT") or args.port
    max_host = os.environ.get("MARKOV_MAX_HOST", args.max_host)
    max_port = _env_int("MARKOV_MAX_PORT") or args.max_port
    fallback = os.environ.get("MARKOV_FALLBACK", args.fallback)
    if fallback not in FALLBACK_POLICIES:
        raise ValueError(f"Invalid fallback policy: {fallback}")

    debug_env = _env_bool("MARKOV_DEBUG")
    debug = debug_env if debug_env is not None else args.debug

    seed = _env_int("MARKOV_SEED")
    if seed is None:
        seed = args.seed

    # --- Neural + stateful session ------------------------------------------
    neural_temperature = _env_float("NEURAL_TEMPERATURE")
    if neural_temperature is None:
        neural_temperature = args.neural_temperature
    if neural_temperature <= 0:
        raise ValueError(f"neural temperature must be > 0, got {neural_temperature}")

    exclude_env = _env_bool("NEURAL_EXCLUDE_INPUT")
    neural_exclude_input = (
        exclude_env if exclude_env is not None else args.neural_exclude_input
    )

    session_mode = os.environ.get("SESSION_MODE", args.session_mode)
    if session_mode not in SESSION_MODES:
        raise ValueError(f"Invalid session mode: {session_mode}")

    session_max_steps = _env_int("SESSION_MAX_STEPS")
    if session_max_steps is None:
        session_max_steps = args.session_max_steps
    if session_max_steps <= 0:
        raise ValueError(f"session max steps must be > 0, got {session_max_steps}")

    auto_feed_env = _env_bool("SESSION_AUTO_FEED")
    session_auto_feed = (
        auto_feed_env if auto_feed_env is not None else args.session_auto_feed
    )

    if host != "127.0.0.1":
        raise ValueError("v4 requires binding to 127.0.0.1 only")

    return Settings(
        csv_path=csv_path,
        host=host,
        port=port,
        max_host=max_host,
        max_port=max_port,
        fallback=fallback,
        debug=debug,
        seed=seed,
        corpora_path=corpora_path,
        phrase_model_path=phrase_model_path,
        ngram_model_path=ngram_model_path,
        color=color,
        adventure=adventure,
        key=key,
        complexity=complexity,
        gravity=gravity,
        model=model,
        jazznet_dir=jazznet_dir,
        jazznet_epoch=jazznet_epoch,
        neural_temperature=neural_temperature,
        neural_exclude_input=neural_exclude_input,
        session_mode=session_mode,
        session_max_steps=session_max_steps,
        session_auto_feed=session_auto_feed,
    )
