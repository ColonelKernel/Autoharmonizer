#!/usr/bin/env python3
"""Ingest the Bach chorales (music21) as a 4th corpus color.

Adds a ``"bach"`` key to ``data/markov_corpora_t.json`` — first-order chord
transition **counts**, key-transposed so every chorale's tonic is C (major) /
A (minor), using the shared Root:quality vocabulary (see ``src/chord_vocab``).
``"all"`` is then recomputed as the pooled sum of pop909 + openbook +
nottingham + bach, so re-running is idempotent (no double counting).

Usage:
    python3 scripts/build_bach_markov.py [--limit N] [--json PATH]

Runtime service does NOT import music21; this is a one-off build step.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

# Make `src` importable when run as a script from python/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.chord_vocab import (  # noqa: E402
    CANON_ROOT,
    M21_QUALITY,
    transpose_chord,
    transpose_offset,
)
from src.config import repo_root  # noqa: E402

_TRIAD_QUALITY = {"major": "maj", "minor": "min", "diminished": "dim", "augmented": "aug"}
_SOURCE_CORPORA = ("pop909", "openbook", "nottingham", "bach")


def classify(ch) -> str | None:
    """Reduce a music21 chord to a ``Root:quality`` symbol, or None to skip.

    Unclassifiable vertical slices (passing sonorities, incomplete chords) are
    skipped on purpose — merging consecutive duplicates then collapses the
    sequence back to the underlying harmony.
    """
    try:
        c = ch.closedPosition(forceOctave=4, inPlace=False)
        c.removeRedundantPitchNames(inPlace=True)
        root = c.root()
    except Exception:
        return None
    if root is None:
        return None

    qual = M21_QUALITY.get(c.commonName)
    if qual is None:
        # Fallback: triad third/fifth quality (+ seventh if strict seventh).
        base = _TRIAD_QUALITY.get(c.quality)
        if base and c.isSeventh():
            qual = {"maj": "maj7", "min": "min7", "dim": "dim7"}.get(base, base)
        else:
            qual = base
    if qual is None:
        return None
    return f"{CANON_ROOT[root.pitchClass]}:{qual}"


def chorale_symbols(score) -> list[str]:
    """Key-normalized ``Root:quality`` chords for one chorale, repeats merged."""
    k = score.analyze("key")
    tonic_pc = k.tonic.pitchClass
    mode = "min" if k.mode == "minor" else "maj"
    offset = transpose_offset(tonic_pc, mode)
    if offset is None:
        return []

    seq: list[str] = []
    for ch in score.chordify().recurse().getElementsByClass("Chord"):
        sym = classify(ch)
        if sym is None:
            continue
        sym_t = transpose_chord(sym, offset)
        if not seq or seq[-1] != sym_t:  # merge consecutive duplicates
            seq.append(sym_t)
    return seq


def build_bach_counts(limit: int | None) -> dict[str, dict[str, int]]:
    from music21 import corpus  # imported lazily; build-time only

    counts: dict[str, Counter] = defaultdict(Counter)
    n = 0
    for score in corpus.chorales.Iterator():
        seq = chorale_symbols(score)
        for a, b in zip(seq, seq[1:]):
            counts[a][b] += 1
        n += 1
        if n % 25 == 0:
            print(f"  ...{n} chorales")
        if limit and n >= limit:
            break
    print(f"  parsed {n} chorales, {len(counts)} source chords")
    return {src: dict(tos) for src, tos in counts.items()}


def recompute_all(nested: dict) -> dict[str, dict[str, int]]:
    pooled: dict[str, Counter] = defaultdict(Counter)
    for src in _SOURCE_CORPORA:
        for frm, tos in nested.get(src, {}).items():
            for to, cnt in tos.items():
                pooled[frm][to] += cnt
    return {frm: dict(tos) for frm, tos in pooled.items()}


def main() -> None:
    ap = argparse.ArgumentParser(description="Add a Bach chorale corpus to markov_corpora_t.json")
    ap.add_argument("--limit", type=int, default=None, help="Parse only the first N chorales")
    ap.add_argument(
        "--json",
        default=str(repo_root() / "data" / "markov_corpora_t.json"),
        help="Corpora JSON to update in place",
    )
    args = ap.parse_args()

    path = Path(args.json)
    nested = json.loads(path.read_text(encoding="utf-8"))
    print(f"Loaded {path.name}: corpora {list(nested.keys())}")

    print("Ingesting Bach chorales via music21 ...")
    nested["bach"] = build_bach_counts(args.limit)
    nested["all"] = recompute_all(nested)

    path.write_text(json.dumps(nested, indent=1), encoding="utf-8")

    bach_events = sum(sum(t.values()) for t in nested["bach"].values())
    all_events = sum(sum(t.values()) for t in nested["all"].values())
    g7 = nested["bach"].get("G:7", {})
    print(
        f"Wrote {path.name}: bach sources={len(nested['bach'])} "
        f"events={bach_events}; all events={all_events}"
    )
    if g7:
        top = sorted(g7.items(), key=lambda kv: -kv[1])[:4]
        print("  sanity G:7 ->", ", ".join(f"{k} {v}" for k, v in top))


if __name__ == "__main__":
    main()
