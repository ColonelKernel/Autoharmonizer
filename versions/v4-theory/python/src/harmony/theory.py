"""Small, dependency-free harmony vocabulary for the v4 constraint layer.

The learned models still provide the probability distribution.  This module
only describes the musical structure needed to decide how much of that
distribution is appropriate at a requested complexity level.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..chord_vocab import CANON_ROOT, PITCH_CLASSES, QUALITY_INTERVALS, parse_key

MAJOR_SCALE = frozenset({0, 2, 4, 5, 7, 9, 11})
# Natural minor plus the raised leading tone used by functional dominants.
MINOR_SCALE = frozenset({0, 2, 3, 5, 7, 8, 10, 11})

TRIAD_QUALITIES = frozenset({"maj", "min", "dim", "aug", "sus2", "sus4"})
SEVENTH_QUALITIES = frozenset(
    {"maj7", "min7", "7", "dim7", "hdim7", "minmaj7", "maj6", "min6", "6"}
)
EXTENDED_QUALITIES = frozenset(
    {
        "add9", "madd9", "6/9", "9", "maj9", "min9", "11", "maj11",
        "min11", "13", "maj13", "min13",
    }
)
ALTERED_QUALITIES = frozenset(
    {"7b5", "7#5", "7b9", "7#9", "7#11", "7b13", "9#11", "13#11", "maj7#11"}
)

DIATONIC_TRIADS = {
    "maj": ("maj", "min", "min", "maj", "maj", "min", "dim"),
    "min": ("min", "dim", "maj", "min", "maj", "maj", "maj", "dim"),
}
DIATONIC_SEVENTHS = {
    "maj": ("maj7", "min7", "min7", "maj7", "7", "min7", "hdim7"),
    # Harmonic-function compromise: V is dominant and vii is diminished.
    "min": ("min7", "hdim7", "maj7", "min7", "7", "maj7", "7", "dim7"),
}


@dataclass(frozen=True)
class Chord:
    root_pc: int
    quality: str
    bass_pc: int | None = None

    def symbol(self) -> str:
        out = f"{CANON_ROOT[self.root_pc % 12]}:{self.quality}"
        if self.bass_pc is not None:
            out += f"/{CANON_ROOT[self.bass_pc % 12]}"
        return out


def parse_chord(symbol: str) -> Chord | None:
    """Parse the runtime ``Root:quality[/Bass]`` form.

    Common no-colon major/minor symbols are accepted as a convenience, but
    malformed or unknown qualities return ``None`` rather than being guessed.
    """
    if not isinstance(symbol, str):
        return None
    text = symbol.strip().replace("♭", "b").replace("♯", "#")
    if not text or text in {"-", "N", "N.C.", "NC"}:
        return None
    main, slash, bass = text.partition("/")
    if ":" in main:
        root, _, quality = main.partition(":")
    else:
        root = main[:2] if len(main) > 1 and main[1] in "b#" else main[:1]
        suffix = main[len(root):]
        quality = "min" if suffix in {"m", "min"} else (suffix or "maj")
    root_pc = PITCH_CLASSES.get(root)
    bass_pc = PITCH_CLASSES.get(bass) if slash else None
    aliases = {"m": "min", "m7": "min7", "m9": "min9", "m11": "min11", "m13": "min13"}
    quality = aliases.get(quality, quality)
    if root_pc is None or quality not in QUALITY_INTERVALS:
        return None
    if slash and bass_pc is None:
        return None
    return Chord(root_pc, quality, bass_pc)


def complexity_level(value: float) -> int:
    """Map a normalized control value to the five documented tiers (0..4)."""
    try:
        normalized = max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        normalized = 0.0
    return min(4, int(normalized * 5.0))


def scale_pitch_classes(key: str) -> tuple[int, str, frozenset[int]]:
    tonic, mode = parse_key(key)
    tonic = 0 if tonic is None else tonic
    home = MINOR_SCALE if mode == "min" else MAJOR_SCALE
    return tonic, mode, frozenset((tonic + degree) % 12 for degree in home)


def _degree_index(root_pc: int, tonic: int, mode: str) -> int | None:
    scale = sorted(MINOR_SCALE if mode == "min" else MAJOR_SCALE)
    degree = (root_pc - tonic) % 12
    try:
        return scale.index(degree)
    except ValueError:
        return None


def diatonic_quality(root_pc: int, key: str, *, seventh: bool = False) -> str | None:
    tonic, mode, _ = scale_pitch_classes(key)
    idx = _degree_index(root_pc, tonic, mode)
    if idx is None:
        return None
    table = DIATONIC_SEVENTHS if seventh else DIATONIC_TRIADS
    return table[mode][idx]


def is_diatonic(chord: str | Chord, key: str) -> bool:
    parsed = chord if isinstance(chord, Chord) else parse_chord(chord)
    if parsed is None:
        return False
    tonic, mode, scale = scale_pitch_classes(key)
    intervals = QUALITY_INTERVALS.get(parsed.quality)
    if not intervals:
        return False
    # Pitch-class membership checks the quality as well as the root.
    return all((parsed.root_pc + interval) % 12 in scale for interval in intervals)


def harmonic_function(chord: str | Chord, key: str) -> str:
    """Coarse functional label: tonic, predominant, dominant, or colour."""
    parsed = chord if isinstance(chord, Chord) else parse_chord(chord)
    if parsed is None:
        return "C"
    tonic, mode, _ = scale_pitch_classes(key)
    degree = (parsed.root_pc - tonic) % 12
    scale = sorted(MINOR_SCALE if mode == "min" else MAJOR_SCALE)
    index = scale.index(degree) if degree in scale else None
    if parsed.quality.startswith("7") or parsed.quality in {"9", "11", "13", "13#11"}:
        # Any dominant chord is an applied dominant even if its root is chromatic.
        return "D"
    if index in {4, 6}:
        return "D"
    if index in {1, 3}:
        return "PD"
    if index in {0, 2, 5}:
        return "T"
    return "C"


def _is_secondary_dominant(parsed: Chord, key: str) -> bool:
    if parsed.quality not in {"7", "9", "11", "13", "7b9", "7#9", "7#11", "7b13", "13#11"}:
        return False
    tonic, mode, _ = scale_pitch_classes(key)
    scale = MINOR_SCALE if mode == "min" else MAJOR_SCALE
    # A dominant root is a fifth above some scale degree.
    targets = {(tonic + degree) % 12 for degree in scale}
    return (parsed.root_pc - 7) % 12 in targets and parsed.root_pc != (tonic + 7) % 12


def chord_complexity_tier(chord: str | Chord, key: str) -> int:
    """Classify a chord by the minimum tier needed to introduce it.

    0 diatonic triads; 1 diatonic sevenths/inversions; 2 borrowing/applied
    dominants/diminished approaches; 3 extensions and substitutions; 4
    altered or otherwise remote chromatic harmony.
    """
    parsed = chord if isinstance(chord, Chord) else parse_chord(chord)
    if parsed is None:
        return 4
    q = parsed.quality
    if q in ALTERED_QUALITIES:
        return 4
    if q in EXTENDED_QUALITIES:
        return 3
    tonic, _, _ = scale_pitch_classes(key)
    if q in {"7", "9", "11", "13"} and parsed.root_pc == (tonic + 1) % 12:
        return 3  # tritone substitute for V7
    if _is_secondary_dominant(parsed, key):
        return 2
    if is_diatonic(parsed, key):
        if parsed.bass_pc is not None or q in SEVENTH_QUALITIES:
            return 1
        if q in TRIAD_QUALITIES:
            return 0
        return 1
    if q in {"dim", "dim7", "hdim7", "aug"}:
        return 2
    if q in TRIAD_QUALITIES or q in SEVENTH_QUALITIES:
        return 2
    return 4


def nearest_scale_root(root_pc: int, key: str) -> int:
    """Project a pitch class to the nearest scale root (ties move upward)."""
    _, _, scale = scale_pitch_classes(key)
    return min(scale, key=lambda pc: (min((pc - root_pc) % 12, (root_pc - pc) % 12), (pc - root_pc) % 12))


def reduce_for_neural(symbol: str) -> str:
    """Reduce rich v4 symbols to JazzNet's seven-quality feedback alphabet."""
    parsed = parse_chord(symbol)
    if parsed is None:
        return symbol.split("/", 1)[0]
    q = parsed.quality
    if q in {"dim", "dim7"}:
        target = "dim7"
    elif q == "hdim7":
        target = "hdim7"
    elif q.startswith("min") or q in {"madd9", "min6"}:
        target = "min7" if q != "min" else "min"
    elif q in {"7", "9", "11", "13"} or q.startswith("7") or q in {"9#11", "13#11"}:
        target = "7"
    elif q.startswith("maj") or q in {"6", "add9", "6/9"}:
        target = "maj7" if q != "maj" else "maj"
    else:
        target = "maj"
    return f"{CANON_ROOT[parsed.root_pc]}:{target}"
