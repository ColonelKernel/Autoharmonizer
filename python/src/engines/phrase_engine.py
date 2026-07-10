"""Phrase generation: the SEQUENCE is the unit of analysis.

Answers "give me an N-bar phrase in key K" with a list of ``(chord, duration)``
pairs whose harmonic rhythm is **learned** and whose ending is a cadence —
rather than the chord-at-a-time walk (``/chord/input``) driven by hand-authored
rhythm templates.

Model: an observed-state, explicit-duration (semi-Markov) chain over ROOT
MOTION, trained by ``scripts/build_phrase_model.py``. Three decisions define it:

  1. **Explicit durations.** An ordinary Markov chain gives each chord a
     geometric dwell time; it cannot express "chords change on the downbeat or
     at mid-bar". A per-state duration histogram conditioned on metric position
     — ``D(d | quality, onset mod 4)`` — can, and that is the harmonic rhythm.
     (In the corpus, a chord starting on beat 2 lasts exactly 2 beats 95% of
     the time; one starting on a downbeat usually lasts 4.)

  2. **No key is estimated.** The training corpus modulates constantly, so any
     key-relative "degree" alphabet inherits the key-finder's errors into every
     label. The state is instead the interval from the previous root plus the
     new quality, which needs no key and covers the data completely. The
     caller's key is the single absolute anchor, applied only at generation.

  3. **No hidden state, therefore no EM.** Once the representation is chosen,
     every state is observed; training is counting with smoothing. There is no
     Baum-Welch here, and none is needed.

The cadence is *imposed*, not hoped for: the last bar is reserved for the tonic
and reached by an authentic V(7) -> I motion. (The corpus itself resolves only
~40% of the time, so waiting for a cadence to emerge would not work.)

Imports only ``random`` + ``chord_vocab`` — no torch, no music21, no numpy — so
the service keeps its ~0.12 s cold start.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from ..chord_vocab import CANON_ROOT, PITCH_CLASSES, QUALITY_INTERVALS, parse_key

# Duration draws are rejection-sampled for exact phrase length; after this many
# unlucky runs we switch to a truncated draw that always fits (see _run).
MAX_TRIES = 200
# Beats reserved at the end for the tonic resolution.
CADENCE_BARS = 1
# Scale degrees (semitones from the tonic) treated as "at home" in each mode.
# Minor includes the raised 7th so the dominant belongs.
DIATONIC = {
    "maj": frozenset({0, 2, 4, 5, 7, 9, 11}),
    "min": frozenset({0, 2, 3, 5, 7, 8, 10, 11}),
}
# How much a fully-open Cadence dial favors in-key roots. Multiplicative on the
# learned transition weight, so at gravity=0 the corpus is reproduced exactly.
MAX_TONAL_PULL = 4.0


class PhraseModelError(RuntimeError):
    """The trained model file is missing or malformed."""


def _pick(rng: random.Random, dist: list) -> object:
    """Sample a key from a [[key, prob], ...] table (probabilities sum to ~1)."""
    r = rng.random()
    acc = 0.0
    for key, p in dist:
        acc += p
        if r <= acc:
            return key
    return dist[-1][0] if dist else None


class PhraseEngine:
    """Generate whole phrases: [(chord_symbol, duration_in_beats), ...]."""

    def __init__(self, model_path: str | Path, seed: int | None = None) -> None:
        path = Path(model_path)
        try:
            m = json.loads(path.read_text())
        except (OSError, ValueError) as exc:
            raise PhraseModelError(f"cannot load phrase model {path}: {exc}") from exc
        for required in ("transition", "duration", "cadence", "duration_support"):
            if required not in m:
                raise PhraseModelError(f"phrase model {path} missing '{required}'")
        self._m = m
        self._rng = random.Random(seed)
        # transition tables come back from JSON as [[dpc, quality], p]
        self._trans: dict[str, list] = m["transition"]
        self._trans_marginal: list = m["transition_marginal"]
        self._dur: dict[str, list] = m["duration"]
        self._dur_backoff: dict[str, list] = m["duration_backoff"]
        self._dur_all: list = m["duration_all"]
        self._onset_pos: dict[int, float] = {int(k): p for k, p in m.get("onset_position", [])}
        self._cadence: dict = m["cadence"]
        self._diatonic_memo: dict[tuple[int, str, str], bool] = {}

    def _is_diatonic(self, root: int, quality: str, tonic: int, mode: str,
                     home: frozenset[int]) -> bool:
        """Are ALL of this chord's notes in the key's scale?

        Testing the root alone is not enough: in A minor, A:maj7 has a diatonic
        ROOT but a raised third and seventh. Testing the chord's pitch classes
        yields exactly the diatonic sevenths of the key (in C: Cmaj7 Dm7 Em7
        Fmaj7 G7 Am7 Bhdim7) and correctly rejects A:maj7 in A minor.
        """
        degree = (root - tonic) % 12
        memo_key = (degree, quality, mode)
        hit = self._diatonic_memo.get(memo_key)
        if hit is None:
            intervals = QUALITY_INTERVALS.get(quality)
            hit = bool(intervals) and all((degree + iv) % 12 in home for iv in intervals)
            self._diatonic_memo[memo_key] = hit
        return hit

    # --- distribution access with backoff ---------------------------------

    def _draw_motion(self, quality: str, rng: random.Random, root: int = 0,
                     ctx: dict | None = None) -> tuple[int, str]:
        """(root motion in semitones, next quality) given the current quality.

        TONAL GRAVITY: the model is trained key-free, so on its own an order-1
        motion chain reproduces the corpus's constant modulation and a long
        phrase drifts far from home. Since the key IS known at generation time,
        `ctx['gravity']` (>0) reweights candidates toward chords that are wholly
        diatonic in it. The bonus is multiplicative, so out-of-key colour (a
        secondary dominant, a tritone sub) stays reachable — it just gets rarer.
        At gravity=0 the corpus distribution is reproduced untouched.
        """
        dist = self._trans.get(quality) or self._trans_marginal
        if not dist:
            return 5, "7"  # descending fifth into a dominant: the corpus's backbone
        if ctx and ctx["gravity"] > 0:
            bonus = 1.0 + MAX_TONAL_PULL * min(1.0, ctx["gravity"])
            tonic, mode, home = ctx["tonic"], ctx["mode"], ctx["home"]
            weighted = [
                [k, p * (bonus if self._is_diatonic((root + int(k[0])) % 12, str(k[1]),
                                                    tonic, mode, home) else 1.0)]
                for k, p in dist
            ]
            total = sum(p for _, p in weighted)
            if total > 0:
                dist = [[k, p / total] for k, p in weighted]
        pick = _pick(rng, dist)
        if not pick:
            return 5, "7"
        return int(pick[0]), str(pick[1])

    def _draw_duration(self, quality: str, m: int, rng: random.Random,
                       max_d: int | None = None) -> int:
        """Learned harmonic rhythm: duration given quality + metric position.

        `max_d` truncates the support so a run can land exactly on its target;
        1 beat is always in the support, so a truncated draw always exists.
        """
        for dist in (self._dur.get(f"{quality}|{m}"), self._dur_backoff.get(str(m)), self._dur_all):
            if not dist:
                continue
            if max_d is not None:
                dist = [[d, p] for d, p in dist if d <= max_d]
                if not dist:
                    continue
                total = sum(p for _, p in dist)
                dist = [[d, p / total] for d, p in dist]
            d = _pick(rng, dist)
            if d:
                return int(d)
        return 1 if max_d is None else min(1, max_d)

    # --- run construction ---------------------------------------------------

    def _run(self, root: int, quality: str, target: int, rng: random.Random,
             truncate: bool, ctx: dict) -> list[tuple[int, str, int]] | None:
        """Walk the chain from (root, quality) for exactly `target` beats.

        Returns [(root_pc, quality, dur), ...] or None if it overshot (only
        possible when truncate=False). Metric position is tracked so durations
        stay idiomatic (mid-bar chords fill to the downbeat).
        """
        segs: list[tuple[int, str, int]] = []
        onset = 0
        while onset < target:
            remaining = target - onset
            d = self._draw_duration(quality, onset % 4, rng, remaining if truncate else None)
            if d > remaining:
                return None  # overshot: reject this run
            segs.append((root, quality, d))
            onset += d
            if onset == target:
                return segs
            dpc, quality = self._draw_motion(quality, rng, root, ctx)
            root = (root + dpc) % 12
        return segs

    def _body(self, root: int, quality: str, target: int,
              rng: random.Random, ctx: dict) -> list[tuple[int, str, int]]:
        """Exact-length body. Rejection-sample for distributional fidelity, then
        fall back to a truncated draw that cannot fail (never returns silence)."""
        if target <= 0:
            return []
        for _ in range(MAX_TRIES):
            run = self._run(root, quality, target, rng, False, ctx)
            if run:
                return run
        return self._run(root, quality, target, rng, True, ctx) or [(root, quality, target)]

    # --- public API ---------------------------------------------------------

    def generate(self, bars: int, key: str, seed_chord: str | None = None,
                 cadence: float = 1.0, seed: int | None = None) -> list[tuple[str, int]]:
        """An `bars`-bar phrase in `key` as [(chord, duration_beats), ...].

        Durations sum to exactly ``bars * 4``, and their pattern is the learned
        harmonic rhythm.

        `cadence` (0..1) is the phrase's pull toward home, and does two things:
        it is the probability that the final bar is a tonic reached by an
        authentic V(7) -> I, and it is the strength of the tonal gravity that
        keeps the body's roots in key. At 0 the phrase wanders and ends
        unresolved (as ~60% of the corpus does); at 1 it stays home and
        cadences. `seed_chord` optionally starts the walk somewhere other than
        the tonic. `seed` makes the result deterministic.
        """
        bars = max(1, int(bars))
        total = bars * 4
        rng = random.Random(seed) if seed is not None else self._rng

        tonic_pc, mode = parse_key(key)
        if tonic_pc is None:
            tonic_pc = 0
        cad = self._cadence.get("minor" if mode == "min" else "major", {})
        final_q = str(cad.get("final") or ("min7" if mode == "min" else "maj7"))
        pre_q = str(cad.get("pre") or "7")
        gravity = max(0.0, min(1.0, float(cadence)))
        ctx = {"tonic": tonic_pc, "mode": mode, "gravity": gravity,
               "home": DIATONIC.get(mode, DIATONIC["maj"])}

        start_root, start_q = tonic_pc, final_q
        if seed_chord:
            parsed = self._parse_symbol(seed_chord)
            if parsed:
                start_root, start_q = parsed

        resolve = rng.random() < gravity
        if not resolve or total < 4 + 2:
            # Free ending: one unconstrained run of the whole phrase.
            return self._render(self._body(start_root, start_q, total, rng, ctx))

        # Reserve the final bar for the tonic, and the V(7) that leads to it.
        # The V's duration is drawn at the metric position it actually lands on,
        # so a mid-bar dominant fills to the downbeat like the corpus does.
        tail = CADENCE_BARS * 4
        dom_root = (tonic_pc + 7) % 12  # V: a descending fifth from the tonic
        dom_dur = self._dominant_duration(total - tail, rng)
        body_target = total - tail - dom_dur

        segs = self._body(start_root, start_q, body_target, rng, ctx) if body_target > 0 else []
        segs.append((dom_root, pre_q, dom_dur))
        segs.append((tonic_pc, final_q, tail))
        return self._render(segs)

    def _dominant_duration(self, avail: int, rng: random.Random) -> int:
        """How long the cadential V is held. Must leave >=1 beat of body when
        there is room for one, so short phrases still start somewhere.

        A V of length d starts at beat (avail - d), i.e. at metric position
        m = (avail - d) % 4. Each candidate length therefore implies a DIFFERENT
        metric position, so candidates must be scored by the joint

            P(m) * P(d | quality='7', m)

        and NOT by P(d | q, m) alone: an off-beat onset is almost always 1 beat
        long, so the conditional would make a weak-beat, 1-beat dominant look
        near-certain and the cadence would land off the beat.
        """
        max_d = max(1, min(avail - 1, 4)) if avail > 1 else 1
        weights: list[list] = []
        for d in self._m["duration_support"]:
            if d > max_d:
                continue
            m = (avail - d) % 4
            p_m = self._onset_pos.get(m, 0.0)
            if p_m <= 0:
                continue
            for dist in (self._dur.get(f"7|{m}"), self._dur_backoff.get(str(m)), self._dur_all):
                if dist:
                    p_d = next((prob for dd, prob in dist if dd == d), 0.0)
                    if p_d > 0:
                        weights.append([d, p_m * p_d])
                    break
        if not weights:
            return max_d
        total = sum(p for _, p in weights)
        return int(_pick(rng, [[d, p / total] for d, p in weights]) or max_d)

    def _parse_symbol(self, sym: str) -> tuple[int, str] | None:
        if not sym or ":" not in sym:
            return None
        root, _, quality = sym.partition(":")
        pc = PITCH_CLASSES.get(root)
        if pc is None or quality not in self._m.get("qualities", []):
            return None
        return pc, quality

    @staticmethod
    def _render(segs: list[tuple[int, str, int]]) -> list[tuple[str, int]]:
        """Pitch classes -> canonical runtime spelling ('Bb:maj7', never 'B-').

        Coalesces adjacent identical chords into one held chord. Training data
        is run-length encoded, so the chain itself never repeats a chord — but
        splicing the cadential V onto a body that already ended on the V would,
        and the device would re-trigger the chord instead of sustaining it.
        """
        out: list[tuple[str, int]] = []
        for r, q, d in segs:
            symbol = f"{CANON_ROOT[r % 12]}:{q}"
            if out and out[-1][0] == symbol:
                out[-1] = (symbol, out[-1][1] + int(d))
            else:
                out.append((symbol, int(d)))
        return out
