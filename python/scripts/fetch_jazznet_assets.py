#!/usr/bin/env python3
"""Download JazzNet checkpoints and vocab from GitHub (train branch)."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

REPO = "scalzadonna/JazzNet"
BASE_RAW = f"https://raw.githubusercontent.com/{REPO}"

ASSETS = [
    ("data/processed/chords.json", "chords.json"),
    ("models/rnn/baselineRNN-epoch{epoch}.pt", "checkpoints/rnn/baselineRNN-epoch{epoch}.pt"),
    ("models/lstm/ChordLSTM-epoch{epoch}.pt", "checkpoints/lstm/ChordLSTM-epoch{epoch}.pt"),
]

HYPERPARAMS = {
    "embedding_dim": 48,
    "hidden_dim": 128,
    "n_layers": 2,
    "dropout": 0.3,
    "padding_idx": 0,
}


def repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / "PLAN.md").exists():
            return parent
    return Path.cwd()


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  fetching {url}")
    with urllib.request.urlopen(url) as response:
        dest.write_bytes(response.read())
    print(f"  wrote {dest} ({dest.stat().st_size} bytes)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch JazzNet assets for autoharmonizer-max")
    parser.add_argument("--branch", default="train", help="JazzNet git branch")
    parser.add_argument("--epoch", type=int, default=35, help="Checkpoint epoch number")
    parser.add_argument(
        "--dest",
        type=Path,
        default=None,
        help="Destination directory (default: <repo>/data/jazznet)",
    )
    args = parser.parse_args(argv)

    dest_root = args.dest or (repo_root() / "data" / "jazznet")
    dest_root.mkdir(parents=True, exist_ok=True)

    print(f"Downloading JazzNet assets (branch={args.branch}, epoch={args.epoch})")
    print(f"Destination: {dest_root}")

    for remote_template, local_template in ASSETS:
        remote = remote_template.format(epoch=args.epoch)
        local = local_template.format(epoch=args.epoch)
        url = f"{BASE_RAW}/{args.branch}/{remote}"
        download(url, dest_root / local)

    metadata = {
        "source_repo": f"https://github.com/{REPO}",
        "branch": args.branch,
        "epoch": args.epoch,
        "hyperparameters": HYPERPARAMS,
    }
    meta_path = dest_root / "metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"  wrote {meta_path}")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
