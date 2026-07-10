"""Notation bridge between this project's chord spelling and JazzNet's.

This project spells flats with a trailing ``b`` (``Bb:maj7``, ``Db:7``); JazzNet's
vocabulary spells them with a dash (``B-:maj7``, ``D-:7``). Sharps (``F#``) and the
``Root:quality`` colon format are identical, so only the flat marker differs.

Applied around the neural engines: convert the incoming chord to JazzNet spelling
before lookup, and convert the model's reply back so the Max chord parser (which
expects ``Bb``) can sonify it. Non-chord tokens pass through unchanged.
"""

from __future__ import annotations


def to_jazznet(chord: str) -> str:
    """``Bb:maj7`` -> ``B-:maj7`` (flat ``b`` in the root becomes ``-``)."""
    if not chord or ":" not in chord:
        return chord.replace("b", "-") if chord else chord
    root, _, qual = chord.partition(":")
    return f"{root.replace('b', '-')}:{qual}"


def from_jazznet(chord: str) -> str:
    """``B-:maj7`` -> ``Bb:maj7`` (dash flat in the root becomes ``b``)."""
    if not chord or ":" not in chord:
        return chord.replace("-", "b") if chord else chord
    root, _, qual = chord.partition(":")
    return f"{root.replace('-', 'b')}:{qual}"
