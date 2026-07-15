"""Chord root/quality vocabulary and key transposition.

Vendored from the POP909 melody_chord_dataset build scripts
(`build_dataset.py` / `build_combined.py`) so this project is self-contained:
the `/Volumes/Mac-Storage` dataset repo is not always mounted, but the exact
same constants and transposition convention are required to (a) normalize an
incoming chord into the corpora's key space and back, and (b) ingest new
corpora (Bach) with symbols that match the shared 163-symbol vocabulary.

Key-space convention (identical to how `chord_t` was computed in the data):
a song is transposed so its tonic sits at **C** for major keys / **A** for
minor keys. `key_offset()` returns that semitone shift; `transpose_chord()`
applies any shift; passing the negated offset transposes a normalized chord
back into the song's key.
"""

from __future__ import annotations

import re

# Note-name (incl. enharmonics) -> pitch class 0..11
PITCH_CLASSES: dict[str, int] = {
    "C": 0, "B#": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4,
    "Fb": 4, "F": 5, "E#": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10, "B": 11, "Cb": 11,
}

# Pitch class 0..11 -> canonical spelling used in every corpus symbol
CANON_ROOT: list[str] = [
    "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
]

# The shared base-quality vocabulary (chord quality -> interval set). This is
# the authoritative list of qualities any corpus symbol may use.
QUALITY_INTERVALS: dict[str, tuple[int, ...]] = {
    "maj": (0, 4, 7), "min": (0, 3, 7), "dim": (0, 3, 6), "aug": (0, 4, 8),
    "sus2": (0, 2, 7), "sus4": (0, 5, 7),
    "maj7": (0, 4, 7, 11), "min7": (0, 3, 7, 10), "7": (0, 4, 7, 10),
    "dim7": (0, 3, 6, 9), "hdim7": (0, 3, 6, 10), "minmaj7": (0, 3, 7, 11),
    "maj6": (0, 4, 7, 9), "min6": (0, 3, 7, 9), "6": (0, 4, 7, 9),
    "add9": (0, 4, 7, 2), "madd9": (0, 3, 7, 2), "6/9": (0, 4, 7, 9, 2),
    "9": (0, 4, 7, 10, 2), "maj9": (0, 4, 7, 11, 2), "min9": (0, 3, 7, 10, 2),
    "11": (0, 7, 10, 2, 5), "maj11": (0, 4, 7, 11, 2, 5),
    "min11": (0, 3, 7, 10, 2, 5), "13": (0, 4, 7, 10, 2, 9),
    "maj13": (0, 4, 7, 11, 2, 9), "min13": (0, 3, 7, 10, 2, 9),
    "7b5": (0, 4, 6, 10), "7#5": (0, 4, 8, 10),
    "7b9": (0, 4, 7, 10, 1), "7#9": (0, 4, 7, 10, 3),
    "7#11": (0, 4, 7, 10, 6), "7b13": (0, 4, 7, 10, 8),
    "9#11": (0, 4, 7, 10, 2, 6), "13#11": (0, 4, 7, 10, 2, 6, 9),
    "maj7#11": (0, 4, 7, 11, 6),
}

# music21 chord quality/commonName -> our base quality. music21's `.quality`
# yields one of {major, minor, diminished, augmented, other}; we refine with
# seventh detection in build_bach_markov.py, but this map covers the labels
# music21 hands back from `.pitchedCommonName` / `.commonName`.
M21_QUALITY: dict[str, str] = {
    "major triad": "maj",
    "minor triad": "min",
    "diminished triad": "dim",
    "augmented triad": "aug",
    "dominant seventh chord": "7",
    "major seventh chord": "maj7",
    "minor seventh chord": "min7",
    "diminished seventh chord": "dim7",
    "half-diminished seventh chord": "hdim7",
    "minor-major seventh chord": "minmaj7",
    "major sixth chord": "maj6",
    "minor sixth chord": "min6",
}

_SYM_RE = re.compile(r"^([A-G][b#]?)(.*)$")


def convert_symbol(sym: str, quality_map: dict[str, str]) -> str | None:
    """'Bbmaj7' -> 'Bb:maj7' in the Root:quality convention, or None."""
    m = _SYM_RE.match(sym.strip())
    if not m or m.group(1) not in PITCH_CLASSES:
        return None
    qual = quality_map.get(m.group(2))
    if qual is None:
        return None
    return f"{CANON_ROOT[PITCH_CLASSES[m.group(1)]]}:{qual}"


def parse_key(key_str: str) -> tuple[int | None, str]:
    """Return (tonic_pc, mode) from a key string.

    Accepts the runtime forms the Max device sends: ``'C:maj'`` / ``'A:min'``
    (Root:mode) and bare ``'C'`` / ``'Am'``. Unknown -> (None, 'maj').
    """
    if not isinstance(key_str, str) or not key_str.strip():
        return None, "maj"
    key_str = key_str.strip()
    if ":" in key_str:  # 'Gb:maj'
        root, _, mode = key_str.partition(":")
        return PITCH_CLASSES.get(root), ("min" if mode.startswith("min") else "maj")
    if " " in key_str:  # 'Eb major'
        root, _, mode = key_str.partition(" ")
        return PITCH_CLASSES.get(root), ("min" if mode.startswith("min") else "maj")
    if key_str.endswith("m"):  # 'Gm'
        return PITCH_CLASSES.get(key_str[:-1]), "min"
    return PITCH_CLASSES.get(key_str), "maj"


def transpose_offset(tonic_pc: int | None, mode: str) -> int | None:
    """Semitone shift putting the tonic at C (major) / A (minor), in -5..+6."""
    if tonic_pc is None:
        return None
    target = 0 if mode == "maj" else 9
    off = (target - tonic_pc) % 12
    return off - 12 if off > 6 else off


def key_offset(key_str: str) -> int:
    """Semitone shift moving a chord in `key_str` into normalized (C/Am) space.

    Returns 0 for an unknown/blank key, so transposition degrades to identity
    (matching the corpora, which are already in C/Am space).
    """
    tonic_pc, mode = parse_key(key_str)
    off = transpose_offset(tonic_pc, mode)
    return 0 if off is None else off


def transpose_chord(simple: str, offset: int) -> str:
    """Shift a ``Root:quality`` symbol by `offset` semitones (mod 12).

    Pass ``key_offset(k)`` to normalize into C/Am space; pass the negated
    offset to transpose a normalized chord back into key `k`. Non-chord tokens
    (``''`` / ``'-'`` / ``'N'``) pass through unchanged.
    """
    if simple in ("", "-", "N") or ":" not in simple:
        return simple
    main, slash, bass = simple.partition("/")
    root, _, qual = main.partition(":")
    if root not in PITCH_CLASSES:
        return simple
    out = f"{CANON_ROOT[(PITCH_CLASSES[root] + offset) % 12]}:{qual}"
    if slash and bass in PITCH_CLASSES:
        out += f"/{CANON_ROOT[(PITCH_CLASSES[bass] + offset) % 12]}"
    return out
