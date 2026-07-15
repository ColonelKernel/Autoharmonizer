"""ONNX export parity: the exported graphs must match PyTorch exactly enough
that the Python-free Max device produces the same chords as the Python service.

Two things are pinned here, and they fail for different reasons:

  * SINGLE-STEP parity catches a wrong graph (bad wiring, dropout left on,
    an op that ONNX lowered differently).
  * MULTI-STEP CARRY parity catches drift that only appears once the hidden
    state is fed back into the next step — a single-step test cannot see it.

Also re-asserts the invariant the exporter relies on: for one token the LSTM's
pack_padded_sequence/pad_packed_sequence path is *identical* to the unpacked
path, which is why the export may drop them.

Skipped cleanly if the artifacts have not been exported yet
(`python3 scripts/export_jazznet_onnx.py`).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

torch = pytest.importorskip("torch")
ort = pytest.importorskip("onnxruntime")
np = pytest.importorskip("numpy")

REPO = Path(__file__).resolve().parents[2]
JAZZNET = REPO / "data" / "jazznet"
ONNX_DIR = JAZZNET / "onnx"

pytestmark = pytest.mark.skipif(
    not (ONNX_DIR / "rnn.onnx").is_file() or not (ONNX_DIR / "lstm.onnx").is_file(),
    reason="ONNX not exported; run scripts/export_jazznet_onnx.py",
)

TOL = 1e-4


@pytest.fixture(scope="module")
def setup():
    import sys

    sys.path.insert(0, str(REPO / "python" / "scripts"))
    from export_jazznet_onnx import LSTMStep, RNNStep, build_models  # noqa: E402

    from src.engines.jazznet_vocab import load_vocab

    meta = json.loads((JAZZNET / "metadata.json").read_text()).get("hyperparameters", {})
    hid, layers = meta.get("hidden_dim", 128), meta.get("n_layers", 2)
    vocab = load_vocab(JAZZNET / "chords.json")
    rnn, lstm = build_models(vocab.vocab_size, meta)
    return {
        "vocab": vocab,
        "hid": hid,
        "layers": layers,
        "rnn_step": RNNStep(rnn).eval(),
        "lstm_step": LSTMStep(lstm).eval(),
        "lstm_raw": lstm,
        "rnn_sess": ort.InferenceSession(str(ONNX_DIR / "rnn.onnx"), providers=["CPUExecutionProvider"]),
        "lstm_sess": ort.InferenceSession(str(ONNX_DIR / "lstm.onnx"), providers=["CPUExecutionProvider"]),
    }


def _zeros(setup):
    return np.zeros((setup["layers"], 1, setup["hid"]), dtype=np.float32)


def _tok(i):
    return np.array([[i]], dtype=np.int64)


def test_graph_io_contract(setup):
    """The JS backend feeds these names/shapes by hand — pin them."""
    assert [i.name for i in setup["rnn_sess"].get_inputs()] == ["token", "h_in"]
    assert [o.name for o in setup["rnn_sess"].get_outputs()] == ["logits", "h_out"]
    assert [i.name for i in setup["lstm_sess"].get_inputs()] == ["token", "h_in", "c_in"]
    assert [o.name for o in setup["lstm_sess"].get_outputs()] == ["logits", "h_out", "c_out"]


def test_packed_equals_unpacked_single_step(setup):
    """The export drops pack_padded_sequence. That is only legal because at
    seq=1 it is the identity — assert it, don't assume it."""
    lstm = setup["lstm_raw"]
    with torch.no_grad():
        for tok in (1, 2, 42, setup["vocab"].vocab_size - 1):
            x = torch.tensor([[tok]], dtype=torch.long)
            packed, (ph, pc) = lstm(x, torch.tensor([1]), None)
            raw, (uh, uc) = lstm.lstm(lstm.embedding(x), None)
            assert torch.equal(packed, lstm.fc(raw))
            assert torch.equal(ph, uh) and torch.equal(pc, uc)


@pytest.mark.parametrize("token", [1, 2, 3, 7, 42, 55, 100, 117])
def test_rnn_single_step_parity(setup, token):
    with torch.no_grad():
        pl, ph = setup["rnn_step"](torch.tensor([[token]]), torch.zeros(setup["layers"], 1, setup["hid"]))
    ol, oh = setup["rnn_sess"].run(None, {"token": _tok(token), "h_in": _zeros(setup)})
    assert np.abs(pl.numpy() - ol).max() < TOL
    assert np.abs(ph.numpy() - oh).max() < TOL
    assert int(np.argmax(ol)) == int(torch.argmax(pl))


@pytest.mark.parametrize("token", [1, 2, 3, 7, 42, 55, 100, 117])
def test_lstm_single_step_parity(setup, token):
    z = torch.zeros(setup["layers"], 1, setup["hid"])
    with torch.no_grad():
        pl, ph, pc = setup["lstm_step"](torch.tensor([[token]]), z, z.clone())
    ol, oh, oc = setup["lstm_sess"].run(
        None, {"token": _tok(token), "h_in": _zeros(setup), "c_in": _zeros(setup)})
    assert np.abs(pl.numpy() - ol).max() < TOL
    assert np.abs(ph.numpy() - oh).max() < TOL
    assert np.abs(pc.numpy() - oc).max() < TOL
    assert int(np.argmax(ol)) == int(torch.argmax(pl))


def test_multi_step_carry_parity(setup):
    """Errors compound only when the hidden state is carried. This is the test
    that would catch a subtly-wrong recurrence."""
    seq = [1, 42, 7, 100, 55, 13, 88]
    layers, hid = setup["layers"], setup["hid"]

    h_pt = torch.zeros(layers, 1, hid)
    h_ort = _zeros(setup)
    hl_pt, cl_pt = torch.zeros(layers, 1, hid), torch.zeros(layers, 1, hid)
    hl_ort, cl_ort = _zeros(setup), _zeros(setup)

    with torch.no_grad():
        for step, tok in enumerate(seq):
            x = torch.tensor([[tok]])
            pl, h_pt = setup["rnn_step"](x, h_pt)
            ol, h_ort = setup["rnn_sess"].run(None, {"token": _tok(tok), "h_in": h_ort})
            assert np.abs(pl.numpy() - ol).max() < TOL, f"rnn logits drift at step {step}"
            assert np.abs(h_pt.numpy() - h_ort).max() < TOL, f"rnn hidden drift at step {step}"

            pl2, hl_pt, cl_pt = setup["lstm_step"](x, hl_pt, cl_pt)
            ol2, hl_ort, cl_ort = setup["lstm_sess"].run(
                None, {"token": _tok(tok), "h_in": hl_ort, "c_in": cl_ort})
            assert np.abs(pl2.numpy() - ol2).max() < TOL, f"lstm logits drift at step {step}"
            assert np.abs(hl_pt.numpy() - hl_ort).max() < TOL, f"lstm h drift at step {step}"
            assert np.abs(cl_pt.numpy() - cl_ort).max() < TOL, f"lstm c drift at step {step}"


def test_first_step_context_equals_two_single_steps(setup):
    """The sampler's first step feeds [BOS, chord]. The JS engine implements
    that as two sequential single-steps, so they must agree with the packed
    2-token forward the Python engine actually runs."""
    lstm, vocab = setup["lstm_raw"], setup["vocab"]
    idx = 42
    with torch.no_grad():
        ctx = torch.tensor([[vocab.bos_idx, idx]], dtype=torch.long)
        packed_out, _ = lstm(ctx, torch.tensor([2]), None)
        packed_logits = packed_out[0][-1]

        z = torch.zeros(setup["layers"], 1, setup["hid"])
        _, h, c = setup["lstm_step"](torch.tensor([[vocab.bos_idx]]), z, z.clone())
        stepped_logits, _, _ = setup["lstm_step"](torch.tensor([[idx]]), h, c)

    assert torch.allclose(packed_logits, stepped_logits, atol=1e-6)


def test_exported_vocab_matches_source(setup):
    """If chords.json is ever regenerated without re-exporting, every token id
    silently shifts. Fail loudly instead."""
    exported = json.loads((JAZZNET / "vocab.json").read_text())
    vocab = setup["vocab"]
    assert exported["vocab_size"] == vocab.vocab_size == 118
    assert (exported["pad_idx"], exported["bos_idx"], exported["eos_idx"]) == (0, 1, 2)
    assert exported["idx_to_chord"] == [vocab.idx_to_chord[i] for i in range(vocab.vocab_size)]


def test_weights_shapes_match_state_dict(setup):
    """The pure-JS backend reads these; a shape drift would be silent garbage."""
    import base64

    for name, model in (("rnn", setup["rnn_step"]), ("lstm", setup["lstm_step"])):
        payload = json.loads((JAZZNET / f"weights_{name}.json").read_text())
        for key, shape in payload["shapes"].items():
            raw = base64.b64decode(payload["tensors"][key])
            assert len(raw) == 4 * int(np.prod(shape)), f"{name}.{key} byte length != shape"
