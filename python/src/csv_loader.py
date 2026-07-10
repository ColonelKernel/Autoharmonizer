"""Load and validate Markov transition CSV data."""

from __future__ import annotations

import csv
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from .config import PROB_SUM_TOLERANCE

REQUIRED_COLUMNS = ("chord_from", "chord_to", "count", "probability")


@dataclass
class Transition:
    to: str
    count: int
    prob: float


@dataclass
class LoadStats:
    raw_rows: int = 0
    source_count: int = 0
    duplicates_merged: int = 0
    normalizations: int = 0


@dataclass
class TransitionTable:
    transitions_by_source: dict[str, list[Transition]]
    weighted_choices_by_source: dict[str, list[tuple[str, float]]]
    global_fallback_pool: list[tuple[str, float]]
    stats: LoadStats = field(default_factory=LoadStats)


class CSVLoadError(Exception):
    """Raised when CSV validation or parsing fails."""


def _validate_header(fieldnames: list[str] | None) -> None:
    if not fieldnames:
        raise CSVLoadError("CSV header is missing")
    missing = [col for col in REQUIRED_COLUMNS if col not in fieldnames]
    if missing:
        raise CSVLoadError(f"CSV missing required columns: {', '.join(missing)}")


def load_transition_table(path: Path) -> TransitionTable:
    if not path.is_file():
        raise CSVLoadError(f"CSV file not found: {path}")

    merged_counts: dict[tuple[str, str], int] = defaultdict(int)
    stats = LoadStats()

    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        _validate_header(reader.fieldnames)

        for line_no, row in enumerate(reader, start=2):
            stats.raw_rows += 1
            chord_from = (row.get("chord_from") or "").strip()
            chord_to = (row.get("chord_to") or "").strip()

            if not chord_from or not chord_to:
                raise CSVLoadError(f"Line {line_no}: empty chord_from or chord_to")

            try:
                count = int(row["count"])
            except (TypeError, ValueError) as exc:
                raise CSVLoadError(f"Line {line_no}: invalid count") from exc

            if count < 0:
                raise CSVLoadError(f"Line {line_no}: count must be non-negative")

            try:
                float(row["probability"])
            except (TypeError, ValueError) as exc:
                raise CSVLoadError(f"Line {line_no}: invalid probability") from exc

            key = (chord_from, chord_to)
            if key in merged_counts:
                stats.duplicates_merged += 1
            merged_counts[key] += count

    if not merged_counts:
        raise CSVLoadError("CSV contains no transition rows")

    by_source_counts: dict[str, list[tuple[str, int]]] = defaultdict(list)
    global_target_counts: dict[str, int] = defaultdict(int)

    for (chord_from, chord_to), count in merged_counts.items():
        by_source_counts[chord_from].append((chord_to, count))
        global_target_counts[chord_to] += count

    transitions_by_source: dict[str, list[Transition]] = {}
    weighted_choices_by_source: dict[str, list[tuple[str, float]]] = {}

    for chord_from, targets in by_source_counts.items():
        total = sum(count for _, count in targets)
        transitions: list[Transition] = []
        weights: list[tuple[str, float]] = []

        for chord_to, count in targets:
            prob = count / total if total else 0.0
            transitions.append(Transition(to=chord_to, count=count, prob=prob))
            weights.append((chord_to, prob))

        prob_sum = sum(item.prob for item in transitions)
        if abs(prob_sum - 1.0) > PROB_SUM_TOLERANCE and prob_sum > 0:
            stats.normalizations += 1
            transitions = [
                Transition(to=item.to, count=item.count, prob=item.prob / prob_sum)
                for item in transitions
            ]
            weights = [(to, prob / prob_sum) for to, prob in weights]

        transitions_by_source[chord_from] = transitions
        weighted_choices_by_source[chord_from] = weights

    if not transitions_by_source:
        raise CSVLoadError("No source chords after grouping")

    global_total = sum(global_target_counts.values())
    if global_total <= 0:
        raise CSVLoadError("Global fallback pool is empty")

    global_fallback_pool = [
        (chord_to, count / global_total)
        for chord_to, count in sorted(
            global_target_counts.items(), key=lambda item: item[1], reverse=True
        )
    ]

    stats.source_count = len(transitions_by_source)

    return TransitionTable(
        transitions_by_source=transitions_by_source,
        weighted_choices_by_source=weighted_choices_by_source,
        global_fallback_pool=global_fallback_pool,
        stats=stats,
    )
