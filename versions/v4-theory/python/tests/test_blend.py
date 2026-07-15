"""Unit tests for the Spice blend: Color, Adventure, transposition, corpora."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import pytest

from src import blend
from src.chord_vocab import key_offset, transpose_chord
from src.config import COLOR_PATH
from src.corpus_loader import load_corpora
from src.markov_engine import MarkovEngine

REPO_ROOT = Path(__file__).resolve().parents[2]
CORPORA_PATH = REPO_ROOT / "data" / "markov_corpora_t.json"


@pytest.fixture(scope="module")
def corpora():
    return load_corpora(CORPORA_PATH)


# --- Color -------------------------------------------------------------------

def test_color_weights_sum_to_one():
    names = list(COLOR_PATH)
    for c in (0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0):
        w = blend.color_weights(c, names)
        assert abs(sum(w.values()) - 1.0) < 1e-9, (c, w)


def test_color_endpoints_select_first_and_last():
    names = list(COLOR_PATH)
    assert blend.color_weights(0.0, names) == {names[0]: 1.0}
    assert blend.color_weights(1.0, names) == {names[-1]: 1.0}


def test_color_drops_unavailable_anchors():
    # Before Bach is built the dial should still span the loaded corpora.
    avail = ["nottingham", "pop909", "openbook"]
    assert blend.color_weights(0.0, avail) == {"nottingham": 1.0}
    assert blend.color_weights(1.0, avail) == {"openbook": 1.0}
    w = blend.color_weights(0.5, avail)
    assert set(w) <= set(avail) and abs(sum(w.values()) - 1.0) < 1e-9


# --- Adventure (temperature) -------------------------------------------------

def test_temperature_bounds():
    assert blend.temperature(0.0) == pytest.approx(0.6)
    assert blend.temperature(1.0) == pytest.approx(1.8)
    assert 0.6 < blend.temperature(0.5) < 1.8


def test_temperature_sharpens_and_flattens():
    dist = {"a": 0.6, "b": 0.3, "c": 0.1}
    sharp = dict(blend._apply_temperature(dist, blend.temperature(0.0)))
    flat = dict(blend._apply_temperature(dist, blend.temperature(1.0)))
    # low adventure concentrates on the top choice; high adventure spreads out
    assert sharp["a"] > dist["a"] > flat["a"]
    assert abs(sum(sharp.values()) - 1.0) < 1e-9
    assert abs(sum(flat.values()) - 1.0) < 1e-9


# --- Transposition -----------------------------------------------------------

@pytest.mark.parametrize("key", ["C:maj", "G:maj", "Eb:maj", "A:min", "E:min"])
@pytest.mark.parametrize("chord", ["C:maj", "G:7", "D:min7", "F#:hdim7"])
def test_transpose_round_trip(key, chord):
    off = key_offset(key)
    assert transpose_chord(transpose_chord(chord, off), -off) == chord


def test_default_key_is_identity():
    assert key_offset("C:maj") == 0
    assert key_offset("") == 0


# --- blended_choices ---------------------------------------------------------

def test_blended_choices_known_vs_unknown(corpora):
    tau = blend.temperature(0.5)
    w = blend.color_weights(1.0, corpora.names())  # jazz
    assert blend.blended_choices(corpora, w, tau, "D:min7"), "known source"
    assert blend.blended_choices(corpora, w, tau, "Z:weird") == [], "unknown source"


def test_jazz_and_folk_differ(corpora):
    tau = blend.temperature(0.5)
    jazz = dict(blend.blended_choices(corpora, blend.color_weights(1.0, corpora.names()), tau, "D:min7"))
    folk = dict(blend.blended_choices(corpora, blend.color_weights(0.0, corpora.names()), tau, "D:min7"))
    assert jazz != folk
    # jazz reaches more distinct continuations than folk from a ii chord
    assert len(jazz) > len(folk)


# --- MarkovEngine blend mode -------------------------------------------------

def _hist(engine: MarkovEngine, chord: str, n: int = 1500) -> Counter:
    c: Counter = Counter()
    for _ in range(n):
        c[engine.sample(chord).output] += 1
    return c


def test_engine_seed_determinism(corpora):
    a = MarkovEngine(corpora=corpora, color=1.0, adventure=0.7, key="C:maj", seed=42)
    b = MarkovEngine(corpora=corpora, color=1.0, adventure=0.7, key="C:maj", seed=42)
    seq_a = [a.sample("D:min7").output for _ in range(20)]
    seq_b = [b.sample("D:min7").output for _ in range(20)]
    assert seq_a == seq_b


def test_jazz_dominant_resolution(corpora):
    # openbook: D:min7 -> G:7 is the overwhelming continuation.
    eng = MarkovEngine(corpora=corpora, color=1.0, adventure=0.5, key="C:maj", seed=1)
    top = _hist(eng, "D:min7").most_common(1)[0][0]
    assert top == "G:7"


def test_adventure_increases_variety(corpora):
    safe = MarkovEngine(corpora=corpora, color=1.0, adventure=0.0, key="C:maj", seed=7)
    wild = MarkovEngine(corpora=corpora, color=1.0, adventure=1.0, key="C:maj", seed=7)
    assert len(_hist(wild, "C:maj")) > len(_hist(safe, "C:maj"))


def test_key_transposition_is_consistent(corpora):
    # A:min7 in G major normalizes to the same D:min7 as D:min7 in C major
    # (A + offset(G)=5 -> D). With the same seed the normalized sample is
    # identical, so the key-G output must be the key-C output shifted by -5.
    off_g = key_offset("G:maj")
    assert transpose_chord("A:min7", off_g) == "D:min7"  # precondition
    in_c = MarkovEngine(corpora=corpora, color=1.0, adventure=0.4, key="C:maj", seed=3)
    in_g = MarkovEngine(corpora=corpora, color=1.0, adventure=0.4, key="G:maj", seed=3)
    out_c = in_c.sample("D:min7").output          # offset 0 -> raw normalized sample
    out_g = in_g.sample("A:min7").output          # same normalized source + seed
    assert out_g == transpose_chord(out_c, -off_g)


def test_spice_macro_sets_both(corpora):
    eng = MarkovEngine(corpora=corpora, seed=1)
    eng.set_spice(0.9)
    assert eng._color == pytest.approx(0.9)
    assert eng._adventure == pytest.approx(0.9)


def test_unknown_chord_echoes(corpora):
    eng = MarkovEngine(corpora=corpora, color=0.5, adventure=0.3, key="C:maj", seed=1, fallback="echo_input")
    r = eng.sample("Q:nonsense")
    assert r.output == "Q:nonsense" and r.fallback_used


# --- Cadence / harmonic gravity ----------------------------------------------

def test_apply_cadence_identity_at_zero():
    choices = [("D:min", 0.5), ("C:maj", 0.3), ("G:maj", 0.2)]
    assert blend._apply_cadence(choices, "maj", 0.0) == choices


def test_apply_cadence_major_boosts_tonic_and_dominant():
    # normalized major: tonic = C (pc 0), dominant = G (pc 7)
    choices = [("D:min", 0.5), ("C:maj", 0.3), ("G:maj", 0.2)]
    out = dict(blend._apply_cadence(choices, "maj", 1.0))
    assert abs(sum(out.values()) - 1.0) < 1e-9
    assert out["C:maj"] == max(out.values())   # tonic pulls hardest
    assert out["C:maj"] > 0.3                   # tonic gained mass
    assert out["G:maj"] > 0.2                   # dominant gained mass too


def test_apply_cadence_minor_targets_a_and_e():
    # normalized minor: tonic = A (pc 9), dominant = E (pc 4)
    choices = [("C:maj", 0.5), ("A:min", 0.3), ("E:maj", 0.2)]
    out = dict(blend._apply_cadence(choices, "min", 1.0))
    assert abs(sum(out.values()) - 1.0) < 1e-9
    assert out["A:min"] == max(out.values())
    assert out["A:min"] > 0.3 and out["E:maj"] > 0.2


def test_blended_choices_gravity_renormalizes_and_lifts_tonic(corpora):
    tau = blend.temperature(0.5)
    w = blend.color_weights(0.5, corpora.names())
    base = dict(blend.blended_choices(corpora, w, tau, "G:maj"))
    pulled = dict(blend.blended_choices(corpora, w, tau, "G:maj", "maj", 1.0))
    assert abs(sum(pulled.values()) - 1.0) < 1e-9
    if "C:maj" in base:  # G -> C is the tonic resolution; must not lose mass
        assert pulled.get("C:maj", 0.0) >= base["C:maj"]


def test_engine_gravity_increases_tonic_frequency(corpora):
    base = MarkovEngine(corpora=corpora, color=0.5, adventure=0.5, key="C:maj", seed=5)
    grav = MarkovEngine(corpora=corpora, color=0.5, adventure=0.5, key="C:maj", seed=5)
    grav.set_gravity(1.0)
    src = "G:maj"
    assert _hist(grav, src)["C:maj"] >= _hist(base, src)["C:maj"]


def test_engine_default_gravity_is_unbiased(corpora):
    # gravity defaults to 0 -> sampling identical to before the feature landed
    a = MarkovEngine(corpora=corpora, color=0.5, adventure=0.5, key="C:maj", seed=9)
    b = MarkovEngine(corpora=corpora, color=0.5, adventure=0.5, key="C:maj", seed=9)
    b.set_gravity(0.0)
    assert [a.sample("G:maj").output for _ in range(30)] == [
        b.sample("G:maj").output for _ in range(30)
    ]


# --- Built corpora artifact --------------------------------------------------

def test_corpora_file_has_all_four_colors():
    nested = json.loads(CORPORA_PATH.read_text(encoding="utf-8"))
    for name in ("pop909", "nottingham", "openbook", "bach", "all"):
        assert name in nested, f"missing corpus {name}"


def test_bach_has_plausible_dominant():
    nested = json.loads(CORPORA_PATH.read_text(encoding="utf-8"))
    g7 = nested["bach"].get("G:7", {})
    assert g7, "bach should have G:7 transitions"
    # V7 -> I is the most common resolution in the chorales.
    assert max(g7, key=g7.get) == "C:maj"
