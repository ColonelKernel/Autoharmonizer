#!/usr/bin/env python3
"""Deterministic offline evaluation for the v4 harmony generators.

The evaluator deliberately uses the same :class:`EngineRegistry` and theory
helpers as the OSC service, but it never opens a socket and does not depend on
Max.  A batch is one progression for a fixed ``(model, complexity, seed)``
triple.  The progression includes its supplied starting chord followed by the
requested number of generated transitions.

The sonifiability metrics are intentionally conservative.  For example, the
theory parser can infer that ``C`` means C major, but a bare pitch-name is still
reported as a single-note risk because a downstream MIDI parser may interpret
it as one note.  V4's unambiguous wire format is ``Root:quality[/Bass]``.

Example::

    python scripts/evaluate_harmony.py \
      --models markov ngram rnn lstm \
      --complexities 0 .25 .5 .75 1 \
      --seeds 7 19 41 --steps 32 \
      --output reports/harmony-evaluation.json
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable, Protocol

# Make ``python scripts/evaluate_harmony.py`` work from any current directory.
PYTHON_DIR = Path(__file__).resolve().parents[1]
if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_DIR))

from src.chord_vocab import QUALITY_INTERVALS  # noqa: E402
from src.config import MODELS, repo_root  # noqa: E402
from src.corpus_loader import load_corpora  # noqa: E402
from src.csv_loader import load_transition_table  # noqa: E402
from src.engines.registry import EngineRegistry  # noqa: E402
from src.harmony.theory import (  # noqa: E402
    chord_complexity_tier,
    harmonic_function,
    is_diatonic,
    parse_chord,
)
from src.markov_engine import MarkovEngine  # noqa: E402


BARE_NOTE_RE = re.compile(r"^[A-G](?:b|#)?$")
DEFAULT_COMPLEXITIES = (0.0, 0.25, 0.5, 0.75, 1.0)
DEFAULT_SEEDS = (7, 19, 41)


class SampleLike(Protocol):
    output: str | None
    fallback_used: bool
    error: str | None


class SamplerLike(Protocol):
    def sample(self, raw_input: str) -> SampleLike: ...


def _rate(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def harmonic_note_count(symbol: str) -> int:
    """Return the number of distinct pitch classes implied by a chord symbol.

    A non-chord returns zero.  A non-chord-tone slash bass contributes one,
    making this a useful lower-bound proxy for the number of MIDI note-ons a
    complete voicing should contain.
    """
    parsed = parse_chord(symbol)
    if parsed is None:
        return 0
    pitch_classes = {
        (parsed.root_pc + interval) % 12
        for interval in QUALITY_INTERVALS[parsed.quality]
    }
    if parsed.bass_pc is not None:
        pitch_classes.add(parsed.bass_pc)
    return len(pitch_classes)


def is_explicit_chord_symbol(symbol: str) -> bool:
    """Whether ``symbol`` uses v4's unambiguous ``Root:quality`` protocol."""
    return parse_chord(symbol) is not None and ":" in symbol


def is_single_note_risk(symbol: str) -> bool:
    """Flag outputs likely to become silence or a single MIDI note downstream."""
    text = symbol.strip() if isinstance(symbol, str) else ""
    return (
        parse_chord(text) is None
        or BARE_NOTE_RE.fullmatch(text) is not None
        or harmonic_note_count(text) < 3
        or not is_explicit_chord_symbol(text)
    )


def progression_metrics(chords: Iterable[str], key: str) -> dict[str, Any]:
    """Calculate stable, dependency-free harmonic metrics for one progression."""
    progression = list(chords)
    note_counts = [harmonic_note_count(symbol) for symbol in progression]
    valid = [parse_chord(symbol) is not None for symbol in progression]
    valid_count = sum(valid)
    explicit = [is_explicit_chord_symbol(symbol) for symbol in progression]
    risks = [is_single_note_risk(symbol) for symbol in progression]

    valid_tiers = [
        chord_complexity_tier(symbol, key)
        for symbol, is_valid in zip(progression, valid)
        if is_valid
    ]
    tier_histogram = {str(tier): valid_tiers.count(tier) for tier in range(5)}
    diatonic_count = sum(
        is_diatonic(symbol, key)
        for symbol, is_valid in zip(progression, valid)
        if is_valid
    )

    valid_function_pairs: list[tuple[str, str]] = []
    for left, right in zip(progression, progression[1:]):
        if parse_chord(left) is not None and parse_chord(right) is not None:
            valid_function_pairs.append(
                (harmonic_function(left, key), harmonic_function(right, key))
            )
    cadence_count = sum(pair == ("D", "T") for pair in valid_function_pairs)
    terminal_cadence = bool(
        len(progression) >= 2
        and parse_chord(progression[-2]) is not None
        and parse_chord(progression[-1]) is not None
        and harmonic_function(progression[-2], key) == "D"
        and harmonic_function(progression[-1], key) == "T"
    )
    tonic_function_ending = bool(
        progression
        and parse_chord(progression[-1]) is not None
        and harmonic_function(progression[-1], key) == "T"
    )

    adjacent_pairs = list(zip(progression, progression[1:]))
    repeated = sum(left == right for left, right in adjacent_pairs)
    total = len(progression)

    return {
        "chord_count": total,
        "valid_chord_count": valid_count,
        "invalid_symbol_rate": _rate(total - valid_count, total),
        "explicit_chord_symbol_rate": _rate(sum(explicit), total),
        "sonifiable_proxy_rate": _rate(
            sum(
                is_valid and is_explicit and count >= 3
                for is_valid, is_explicit, count in zip(valid, explicit, note_counts)
            ),
            total,
        ),
        "single_note_risk_rate": _rate(sum(risks), total),
        "harmonic_note_count_mean": (
            sum(note_counts) / total if total else 0.0
        ),
        "harmonic_note_count_min": min(note_counts, default=0),
        "harmonic_note_count_max": max(note_counts, default=0),
        "complexity_tier_mean": (
            sum(valid_tiers) / len(valid_tiers) if valid_tiers else 0.0
        ),
        "complexity_tier_histogram": tier_histogram,
        "diatonic_rate": _rate(diatonic_count, valid_count),
        "cadential_transition_rate": _rate(
            cadence_count, len(valid_function_pairs)
        ),
        "cadential_transition_count": cadence_count,
        "terminal_cadence": terminal_cadence,
        "tonic_function_ending": tonic_function_ending,
        "adjacent_repetition_rate": _rate(repeated, len(adjacent_pairs)),
        "unique_chord_ratio": _rate(len(set(progression)), total),
    }


def evaluate_sampler(
    sampler: SamplerLike,
    *,
    model: str,
    complexity: float,
    seed: int,
    start_chord: str,
    steps: int,
    key: str,
) -> dict[str, Any]:
    """Generate and score one fixed-seed batch from any registry-like sampler."""
    progression = [start_chord]
    fallback_count = 0
    errors: list[str] = []

    for _ in range(steps):
        result = sampler.sample(progression[-1])
        fallback_count += int(bool(result.fallback_used))
        if result.error:
            errors.append(str(result.error))
        if result.output is None:
            break
        progression.append(str(result.output))

    generated_steps = len(progression) - 1
    return {
        "available": True,
        "model": model,
        "complexity": complexity,
        "seed": seed,
        "key": key,
        "start_chord": start_chord,
        "requested_steps": steps,
        "generated_steps": generated_steps,
        "fallback_count": fallback_count,
        "fallback_rate": _rate(fallback_count, generated_steps),
        "errors": errors,
        "progression": progression,
        "metrics": progression_metrics(progression, key),
    }


def build_sampler(
    *,
    model: str,
    complexity: float,
    seed: int,
    key: str,
    gravity: float,
    color: float,
    adventure: float,
    project_root: Path | None = None,
) -> EngineRegistry:
    """Build the exact offline v4 model stack used by the OSC service."""
    root = project_root or repo_root()
    data = root / "data"
    table = load_transition_table(data / "markov_openbook.csv")
    corpora = load_corpora(data / "markov_corpora_t.json")
    markov = MarkovEngine(
        table,
        corpora=corpora,
        fallback="echo_input",
        seed=seed,
        color=color,
        adventure=adventure,
        key=key,
        gravity=gravity,
    )
    registry = EngineRegistry(
        markov_engine=markov,
        jazznet_dir=data / "jazznet",
        jazznet_epoch=35,
        fallback="echo_input",
        seed=seed,
        initial_model="markov",
        ngram_model_path=data / "theory_ngram.json",
        key=key,
        complexity=complexity,
        gravity=gravity,
    )
    ok, error = registry.set_model(model)
    if not ok:
        raise RuntimeError(error or f"failed to select {model}")
    return registry


def aggregate_batches(batches: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Average comparable metrics per model/complexity, excluding unavailable runs."""
    groups: dict[tuple[str, float], list[dict[str, Any]]] = defaultdict(list)
    for batch in batches:
        if batch.get("available"):
            groups[(str(batch["model"]), float(batch["complexity"]))].append(batch)

    metric_names = (
        "invalid_symbol_rate",
        "explicit_chord_symbol_rate",
        "sonifiable_proxy_rate",
        "single_note_risk_rate",
        "harmonic_note_count_mean",
        "complexity_tier_mean",
        "diatonic_rate",
        "cadential_transition_rate",
        "adjacent_repetition_rate",
        "unique_chord_ratio",
    )
    aggregates: list[dict[str, Any]] = []
    for (model, complexity), items in sorted(groups.items()):
        count = len(items)
        averages = {
            name: sum(float(item["metrics"][name]) for item in items) / count
            for name in metric_names
        }
        tier_histogram = {
            str(tier): sum(
                int(item["metrics"]["complexity_tier_histogram"][str(tier)])
                for item in items
            )
            for tier in range(5)
        }
        aggregates.append(
            {
                "model": model,
                "complexity": complexity,
                "batch_count": count,
                "fallback_rate": sum(float(item["fallback_rate"]) for item in items) / count,
                "terminal_cadence_rate": sum(
                    bool(item["metrics"]["terminal_cadence"]) for item in items
                ) / count,
                "tonic_function_ending_rate": sum(
                    bool(item["metrics"]["tonic_function_ending"]) for item in items
                ) / count,
                "complexity_tier_histogram": tier_histogram,
                **averages,
            }
        )
    return aggregates


def evaluate_matrix(args: argparse.Namespace) -> dict[str, Any]:
    batches: list[dict[str, Any]] = []
    for model in args.models:
        for complexity in args.complexities:
            for seed in args.seeds:
                try:
                    sampler = build_sampler(
                        model=model,
                        complexity=complexity,
                        seed=seed,
                        key=args.key,
                        gravity=args.gravity,
                        color=args.color,
                        adventure=args.adventure,
                    )
                    batch = evaluate_sampler(
                        sampler,
                        model=model,
                        complexity=complexity,
                        seed=seed,
                        start_chord=args.start_chord,
                        steps=args.steps,
                        key=args.key,
                    )
                except Exception as exc:  # keep the rest of a matrix useful
                    batch = {
                        "available": False,
                        "model": model,
                        "complexity": complexity,
                        "seed": seed,
                        "key": args.key,
                        "error": f"{type(exc).__name__}: {exc}",
                    }
                batches.append(batch)

    return {
        "schema_version": 1,
        "description": "Fixed-seed v4 harmony and sonifiability evaluation",
        "config": {
            "models": list(args.models),
            "complexities": list(args.complexities),
            "seeds": list(args.seeds),
            "steps": args.steps,
            "start_chord": args.start_chord,
            "key": args.key,
            "gravity": args.gravity,
            "color": args.color,
            "adventure": args.adventure,
        },
        "batches": batches,
        "aggregates": aggregate_batches(batches),
    }


def render_summary(report: dict[str, Any]) -> str:
    header = (
        "model\tcomplexity\tbatches\tsonifiable\tsingle-note-risk\t"
        "notes\tdiatonic\tcadence\trepetition"
    )
    rows = [header]
    for item in report["aggregates"]:
        rows.append(
            "\t".join(
                (
                    str(item["model"]),
                    f'{item["complexity"]:.2f}',
                    str(item["batch_count"]),
                    f'{item["sonifiable_proxy_rate"]:.3f}',
                    f'{item["single_note_risk_rate"]:.3f}',
                    f'{item["harmonic_note_count_mean"]:.2f}',
                    f'{item["diatonic_rate"]:.3f}',
                    f'{item["cadential_transition_rate"]:.3f}',
                    f'{item["adjacent_repetition_rate"]:.3f}',
                )
            )
        )
    unavailable = [batch for batch in report["batches"] if not batch.get("available")]
    if unavailable:
        rows.append(f"unavailable batches: {len(unavailable)}")
        for batch in unavailable:
            rows.append(
                f'  {batch["model"]} complexity={batch["complexity"]} '
                f'seed={batch["seed"]}: {batch["error"]}'
            )
    return "\n".join(rows)


def _normalized_unit(value: str) -> float:
    parsed = float(value)
    if not math.isfinite(parsed) or not 0.0 <= parsed <= 1.0:
        raise argparse.ArgumentTypeError(f"expected value in 0..1, got {value!r}")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", nargs="+", choices=MODELS, default=list(MODELS))
    parser.add_argument(
        "--complexities",
        nargs="+",
        type=_normalized_unit,
        default=list(DEFAULT_COMPLEXITIES),
    )
    parser.add_argument("--seeds", nargs="+", type=int, default=list(DEFAULT_SEEDS))
    parser.add_argument("--steps", type=int, default=32)
    parser.add_argument("--start-chord", default="C:maj")
    parser.add_argument("--key", default="C:maj")
    parser.add_argument("--gravity", type=_normalized_unit, default=0.6)
    parser.add_argument("--color", type=_normalized_unit, default=0.5)
    parser.add_argument("--adventure", type=_normalized_unit, default=0.35)
    parser.add_argument("--output", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.steps < 1:
        parser.error("--steps must be at least 1")
    if parse_chord(args.start_chord) is None:
        parser.error("--start-chord must be a recognizable chord")

    report = evaluate_matrix(args)
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
        print(f"wrote {args.output}")
        print(render_summary(report))
    else:
        sys.stdout.write(payload)
        print(render_summary(report), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
