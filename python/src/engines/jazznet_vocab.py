"""JazzNet chord vocabulary built from processed chords.json."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class JazzNetVocab:
    chord_to_idx: dict[str, int]
    idx_to_chord: dict[int, str]
    vocab_size: int
    bos_idx: int
    eos_idx: int
    pad_idx: int = 0

    def chord_index(self, chord: str) -> int | None:
        return self.chord_to_idx.get(chord)

    def index_chord(self, index: int) -> str | None:
        return self.idx_to_chord.get(index)

    def is_special(self, index: int) -> bool:
        return index in {self.pad_idx, self.bos_idx, self.eos_idx}


def load_vocab(chords_path: Path) -> JazzNetVocab:
    raw = json.loads(chords_path.read_text())
    sequences = [["<BOS>"] + seq + ["<EOS>"] for seq in raw]
    chord_vocab = sorted({chord for seq in sequences for chord in seq})
    chord_to_idx = {chord: idx + 1 for idx, chord in enumerate(chord_vocab)}
    chord_to_idx["pad"] = 0
    idx_to_chord = {idx + 1: chord for idx, chord in enumerate(chord_vocab)}
    idx_to_chord[0] = "pad"
    vocab_size = max(chord_to_idx.values()) + 1
    bos_idx = chord_to_idx["<BOS>"]
    eos_idx = chord_to_idx["<EOS>"]
    return JazzNetVocab(
        chord_to_idx=chord_to_idx,
        idx_to_chord=idx_to_chord,
        vocab_size=vocab_size,
        bos_idx=bos_idx,
        eos_idx=eos_idx,
    )
