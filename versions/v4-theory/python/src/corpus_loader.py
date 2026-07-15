"""Load the nested per-corpus Markov transition counts.

Reads ``data/markov_corpora_t.json`` — first-order transition **counts** nested
per corpus (``pop909``, ``nottingham``, ``openbook``, ``bach``, ``all``),
key-transposed to C/Am. Each corpus is normalized per source chord into weighted
choices, mirroring the per-source renormalization in
``csv_loader.load_transition_table`` but keeping the corpora separate so the
blend engine can mix them live.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


class CorpusLoadError(Exception):
    """Raised when the corpora JSON is missing or malformed."""


@dataclass
class CorpusTable:
    """One corpus: per-source normalized distributions + raw counts."""

    # source chord -> {target chord: probability within this corpus}
    dist_by_source: dict[str, dict[str, float]]
    # source chord -> total transition count from that source (blend confidence)
    total_by_source: dict[str, int]


@dataclass
class CorporaSet:
    corpora: dict[str, CorpusTable]
    # pooled fallback distribution (from the "all" corpus), most-common first
    global_fallback: list[tuple[str, float]] = field(default_factory=list)

    def names(self) -> list[str]:
        return [n for n in self.corpora if n != "all"]


def _normalize_corpus(raw: dict[str, dict[str, int]]) -> CorpusTable:
    dist_by_source: dict[str, dict[str, float]] = {}
    total_by_source: dict[str, int] = {}
    for source, targets in raw.items():
        total = sum(targets.values())
        total_by_source[source] = total
        if total <= 0:
            dist_by_source[source] = {}
            continue
        dist_by_source[source] = {t: c / total for t, c in targets.items()}
    return CorpusTable(dist_by_source=dist_by_source, total_by_source=total_by_source)


def load_corpora(path: Path) -> CorporaSet:
    if not path.is_file():
        raise CorpusLoadError(f"Corpora JSON not found: {path}")
    try:
        nested = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise CorpusLoadError(f"Failed to read corpora JSON: {exc}") from exc

    if not isinstance(nested, dict) or not nested:
        raise CorpusLoadError("Corpora JSON must be a non-empty object")

    corpora = {name: _normalize_corpus(raw) for name, raw in nested.items()}

    # Global fallback pool from the pooled "all" corpus (or the union if absent).
    pool_counts: dict[str, int] = {}
    all_raw = nested.get("all")
    sources = [all_raw] if all_raw else nested.values()
    for corpus_raw in sources:
        for targets in corpus_raw.values():
            for target, count in targets.items():
                pool_counts[target] = pool_counts.get(target, 0) + count
    total = sum(pool_counts.values()) or 1
    global_fallback = [
        (t, c / total)
        for t, c in sorted(pool_counts.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return CorporaSet(corpora=corpora, global_fallback=global_fallback)
