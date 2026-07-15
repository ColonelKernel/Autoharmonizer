#!/usr/bin/env python3
"""Build v4's variable-order chord model from local JazzNet sequences.

Run from ``versions/v4-theory/python``:

    python3 scripts/build_theory_ngram.py
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
DEFAULT_IN = REPO / "data" / "jazznet" / "chords.json"
DEFAULT_OUT = REPO / "data" / "theory_ngram.json"


def runtime_symbol(symbol: str) -> str:
    root, colon, quality = symbol.partition(":")
    return f"{root.replace('-', 'b')}{colon}{quality}"


def held_chords(sequence: list[str]) -> list[str]:
    """Beat-grid sequence -> chord changes; held beats are not transitions."""
    return [runtime_symbol(symbol) for symbol, _ in itertools.groupby(sequence)]


def ordered(counter: Counter, limit: int) -> list[list]:
    return [[symbol, count] for symbol, count in counter.most_common(limit)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chords", type=Path, default=DEFAULT_IN)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--max-order", type=int, default=4)
    parser.add_argument("--min-context-count", type=int, default=2)
    parser.add_argument("--max-targets", type=int, default=48)
    args = parser.parse_args()

    raw_bytes = args.chords.read_bytes()
    sequences = json.loads(raw_bytes)
    counts: dict[int, dict[tuple[str, ...], Counter]] = {
        n: defaultdict(Counter) for n in range(1, args.max_order + 1)
    }
    global_counts: Counter = Counter()
    transitions = 0
    for raw in sequences:
        sequence = held_chords(raw)
        for index in range(1, len(sequence)):
            target = sequence[index]
            global_counts[target] += 1
            transitions += 1
            for order in range(1, min(args.max_order, index) + 1):
                context = tuple(sequence[index - order:index])
                counts[order][context][target] += 1

    orders: dict[str, dict[str, list[list]]] = {}
    kept_contexts = 0
    for order, table in counts.items():
        rendered: dict[str, list[list]] = {}
        for context, target_counts in table.items():
            if order > 1 and sum(target_counts.values()) < args.min_context_count:
                continue
            rendered["|".join(context)] = ordered(target_counts, args.max_targets)
        orders[str(order)] = rendered
        kept_contexts += len(rendered)

    model = {
        "version": 1,
        "kind": "variable-order chord n-gram",
        "source": "data/jazznet/chords.json",
        "source_sha256": hashlib.sha256(raw_bytes).hexdigest(),
        "max_order": args.max_order,
        "run_length_encoded": True,
        "sequence_count": len(sequences),
        "transition_count": transitions,
        "orders": orders,
        "global": ordered(global_counts, args.max_targets),
    }
    args.out.write_text(json.dumps(model, separators=(",", ":")))
    print(f"wrote {args.out.relative_to(REPO)}")
    print(f"  {len(sequences)} sequences, {transitions} chord changes, {kept_contexts} contexts")
    print(f"  {args.out.stat().st_size / 1024:.1f} KiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
