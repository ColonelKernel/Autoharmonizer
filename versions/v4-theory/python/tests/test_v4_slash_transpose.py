"""Slash-bass chords must remain valid when normalized across keys."""

from __future__ import annotations

import pytest

from src.chord_vocab import transpose_chord


@pytest.mark.parametrize(
    "symbol,offset,expected",
    [
        ("C:maj7/E", 2, "D:maj7/F#"),
        ("Bb:min7/Db", 2, "C:min7/Eb"),
        ("F#:7/C#", -1, "F:7/C"),
        ("C:maj/G", 11, "B:maj/F#"),
        ("C:maj7", 2, "D:maj7"),
    ],
)
def test_transpose_chord_moves_both_root_and_slash_bass(symbol, offset, expected):
    assert transpose_chord(symbol, offset) == expected


@pytest.mark.parametrize("symbol", ["", "-", "N", "not-a-chord"])
def test_transpose_chord_preserves_non_chord_tokens(symbol):
    assert transpose_chord(symbol, 7) == symbol

