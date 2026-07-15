"""Cross-corpus blending: Color (corpus morph) + Adventure (temperature).

The two performable dials both act on the per-corpus transition distributions:

* **Color** ``c in [0,1]`` morphs a 1-D crossfade along an ordered path of
  single-corpus anchors (``COLOR_PATH``, e.g. folk -> pop -> classical -> jazz).
  Piecewise-linear, so anchor positions are pure single corpora and in-between
  positions are genuine two-corpus blends; every corpus is reachable.
* **Adventure** ``a in [0,1]`` sets a sampling temperature ``tau``: low sharpens
  toward the likeliest chord (safe), high flattens the tail so rarer, more
  colorful chords surface.

``blended_choices`` returns ``[(target, prob)]`` ready for weighted sampling, or
an empty list when the source chord is absent from every weighted corpus (the
caller then falls back to the pooled ``all`` chain / fallback policy).
"""

from __future__ import annotations

from .config import (
    ADVENTURE_TAU_MAX,
    ADVENTURE_TAU_MIN,
    CADENCE_DOMINANT_BOOST,
    CADENCE_TONIC_BOOST,
    COLOR_PATH,
    DOMINANT_PC,
    TONIC_PC,
)
from .corpus_loader import CorporaSet
from .chord_vocab import PITCH_CLASSES, key_offset, transpose_chord


def _clamp01(x: float) -> float:
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def color_weights(c: float, available: list[str] | None = None) -> dict[str, float]:
    """Corpus mix weights for Color position ``c`` along ``COLOR_PATH``.

    Anchors not present in ``available`` are dropped from the path first, so the
    dial still spans the corpora that actually loaded (e.g. before Bach is
    built). Returns weights summing to 1.
    """
    path = [name for name in COLOR_PATH if available is None or name in available]
    if not path:
        return {}
    if len(path) == 1:
        return {path[0]: 1.0}

    c = _clamp01(c)
    span = len(path) - 1
    pos = c * span
    i = min(int(pos), span - 1)  # segment index; clamp so c==1 stays in last seg
    frac = pos - i
    weights = {name: 0.0 for name in path}
    weights[path[i]] += 1.0 - frac
    weights[path[i + 1]] += frac
    return {k: v for k, v in weights.items() if v > 0.0}


def temperature(a: float) -> float:
    """Adventure position -> sampling temperature tau (linear interpolation)."""
    a = _clamp01(a)
    return ADVENTURE_TAU_MIN + a * (ADVENTURE_TAU_MAX - ADVENTURE_TAU_MIN)


def _apply_temperature(dist: dict[str, float], tau: float) -> list[tuple[str, float]]:
    if tau <= 0:
        tau = 1e-3
    inv = 1.0 / tau
    reshaped = {t: (p ** inv) for t, p in dist.items() if p > 0.0}
    total = sum(reshaped.values())
    if total <= 0:
        return []
    return sorted(((t, p / total) for t, p in reshaped.items()), key=lambda kv: -kv[1])


def _root_pc(chord: str) -> int | None:
    """Pitch class of a ``Root:quality`` symbol's root, or None for non-chords."""
    return PITCH_CLASSES.get(chord.partition(":")[0])


def _apply_cadence(
    choices: list[tuple[str, float]], mode: str, gravity: float
) -> list[tuple[str, float]]:
    """Bias a ``[(target, prob)]`` list toward the tonic/dominant of ``mode``.

    ``choices`` is assumed to be in normalized (C/Am) key space (as produced by
    ``blended_choices``), so the tonic and dominant roots are fixed per mode.
    ``gravity`` 0 -> identity; 1 -> full boost. Renormalizes and keeps the
    descending-probability order the caller expects.
    """
    if gravity <= 0 or not choices:
        return choices
    tonic = TONIC_PC.get(mode, TONIC_PC["maj"])
    dom = DOMINANT_PC.get(mode, DOMINANT_PC["maj"])
    boosted: list[tuple[str, float]] = []
    for target, prob in choices:
        pc = _root_pc(target)
        if pc == tonic:
            prob *= 1.0 + gravity * CADENCE_TONIC_BOOST
        elif pc == dom:
            prob *= 1.0 + gravity * CADENCE_DOMINANT_BOOST
        boosted.append((target, prob))
    total = sum(p for _, p in boosted)
    if total <= 0:
        return choices
    return sorted(((t, p / total) for t, p in boosted), key=lambda kv: -kv[1])


def blended_choices(
    corpora: CorporaSet,
    weights: dict[str, float],
    tau: float,
    source_chord: str,
    mode: str = "maj",
    gravity: float = 0.0,
) -> list[tuple[str, float]]:
    """Mix weighted corpora for ``source_chord``, temper, return [(target, prob)].

    Empty list -> source chord unknown in all weighted corpora (caller falls
    back). ``source_chord`` must already be in normalized (C/Am) key space.
    ``mode``/``gravity`` apply the cadence bias (``gravity=0`` -> no change).
    """
    mixed: dict[str, float] = {}
    total_weight = 0.0
    for name, w in weights.items():
        if w <= 0:
            continue
        table = corpora.corpora.get(name)
        if table is None:
            continue
        dist = table.dist_by_source.get(source_chord)
        if not dist:
            continue
        total_weight += w
        for target, prob in dist.items():
            mixed[target] = mixed.get(target, 0.0) + w * prob

    if not mixed or total_weight <= 0:
        return []

    # Renormalize the mixture (weights of absent corpora were dropped above).
    norm = {t: p / total_weight for t, p in mixed.items()}
    return _apply_cadence(_apply_temperature(norm, tau), mode, gravity)


def normalize_to_key(chord: str, key: str) -> tuple[str, int]:
    """Transpose an in-key chord into normalized (C/Am) space.

    Returns (normalized_chord, offset); apply ``-offset`` to get back to key.
    """
    offset = key_offset(key)
    return transpose_chord(chord, offset), offset
