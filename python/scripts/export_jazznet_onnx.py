#!/usr/bin/env python3
"""Export the JazzNet RNN/LSTM to ONNX + JS assets, so a Max device can run
them with no Python at runtime.

BUILD-TIME ONLY. Nothing at runtime imports this, and the runtime service is
untouched. Reuses the project's own model classes, checkpoint loader and vocab
so the exported graph cannot drift from what Python serves today.

What it writes (all under data/jazznet/):
    onnx/rnn.onnx            single-step graph: (token, h)       -> (logits, h_out)
    onnx/lstm.onnx           single-step graph: (token, h, c)    -> (logits, h_out, c_out)
    vocab.json               118 tokens + index maps (so JS never parses the 2.2MB chords.json)
    weights_rnn.json         float32 weights for the dependency-free JS fallback backend
    weights_lstm.json
    parity_fixture.json      golden logits/hidden for a probe set, to pin JS <-> PyTorch

WHY A SINGLE-STEP GRAPH
The real ChordLSTM.forward() runs pack_padded_sequence/pad_packed_sequence and
takes a `lengths` argument. Those are data-dependent and hostile to tracing. For
batch=1/seq=1 they are also *identity*: this script asserts the unpacked path
reproduces the packed path exactly (max-abs diff 0.0) before exporting. The
sampler only ever needs one step at a time — a first step feeds [BOS, chord] as
two sequential single-steps — so the step graph is sufficient and honest.

ONNX has no tuple type, so the LSTM's (h, c) hidden becomes two separate
tensors in and two out.

Run (from python/):
    /opt/anaconda3/bin/python3 scripts/export_jazznet_onnx.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import torch
import torch.nn as nn

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(HERE.parent))  # make `src` importable, as build_bach_markov.py does

from src.engines.jazznet_checkpoint import load_checkpoint_state  # noqa: E402
from src.engines.jazznet_models import BaselineRNN, ChordLSTM  # noqa: E402
from src.engines.jazznet_vocab import load_vocab  # noqa: E402

JAZZNET = REPO / "data" / "jazznet"
OPSET = 17


# --- single-step wrappers (pack/pad stripped; hidden flattened) --------------

class RNNStep(nn.Module):
    """(token[1,1] int64, h[2,1,H]) -> (logits[118], h_out[2,1,H])"""

    def __init__(self, model: BaselineRNN) -> None:
        super().__init__()
        self.embedding = model.embedding
        self.rnn = model.rnn
        self.fc = model.fc

    def forward(self, token, h):
        out, h_out = self.rnn(self.embedding(token), h)
        return self.fc(out)[0, -1], h_out


class LSTMStep(nn.Module):
    """(token[1,1] int64, h[2,1,H], c[2,1,H]) -> (logits[118], h_out, c_out)"""

    def __init__(self, model: ChordLSTM) -> None:
        super().__init__()
        self.embedding = model.embedding
        self.lstm = model.lstm
        self.fc = model.fc

    def forward(self, token, h, c):
        out, (h_out, c_out) = self.lstm(self.embedding(token), (h, c))
        return self.fc(out)[0, -1], h_out, c_out


def build_models(vocab_size: int, hparams: dict) -> tuple[BaselineRNN, ChordLSTM]:
    emb = hparams.get("embedding_dim", 48)
    hid = hparams.get("hidden_dim", 128)
    lay = hparams.get("n_layers", 2)
    drop = hparams.get("dropout", 0.3)

    rnn = BaselineRNN(vocab_size, emb, hid, vocab_size, lay, dropout=drop)
    rnn.load_state_dict(load_checkpoint_state(
        JAZZNET / "checkpoints" / "rnn" / "baselineRNN-epoch35.pt", torch.device("cpu")))
    rnn.eval()

    lstm = ChordLSTM(vocab_size, emb, hid, vocab_size, lay, dropout=drop)
    lstm.load_state_dict(load_checkpoint_state(
        JAZZNET / "checkpoints" / "lstm" / "ChordLSTM-epoch35.pt", torch.device("cpu")))
    lstm.eval()
    return rnn, lstm


# --- the load-bearing safety check ------------------------------------------

def assert_unpacked_equals_packed(lstm: ChordLSTM, vocab_size: int) -> None:
    """The export drops pack_padded_sequence. Prove that is a no-op at seq=1
    BEFORE relying on it — otherwise every exported logit is silently wrong."""
    worst = 0.0
    with torch.no_grad():
        for tok in (1, 2, 7, 42, vocab_size - 1):
            x = torch.tensor([[tok]], dtype=torch.long)
            packed_out, (ph, pc) = lstm(x, torch.tensor([1]), None)
            emb = lstm.embedding(x)
            raw_out, (uh, uc) = lstm.lstm(emb, None)
            unpacked_out = lstm.fc(raw_out)
            worst = max(
                worst,
                (packed_out - unpacked_out).abs().max().item(),
                (ph - uh).abs().max().item(),
                (pc - uc).abs().max().item(),
            )
    if worst != 0.0:
        raise SystemExit(f"ABORT: packed vs unpacked differ by {worst} — cannot strip pack/pad")
    print(f"  packed vs unpacked single-step: max-abs diff {worst} (identical)")


# --- export ------------------------------------------------------------------

def export_onnx(rnn: BaselineRNN, lstm: ChordLSTM, hid: int, layers: int, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    tok = torch.tensor([[1]], dtype=torch.long)
    h0 = torch.zeros(layers, 1, hid)
    c0 = torch.zeros(layers, 1, hid)

    torch.onnx.export(
        RNNStep(rnn), (tok, h0), str(out_dir / "rnn.onnx"),
        input_names=["token", "h_in"], output_names=["logits", "h_out"],
        opset_version=OPSET, dynamo=False,
    )
    torch.onnx.export(
        LSTMStep(lstm), (tok, h0, c0), str(out_dir / "lstm.onnx"),
        input_names=["token", "h_in", "c_in"], output_names=["logits", "h_out", "c_out"],
        opset_version=OPSET, dynamo=False,
    )


def dump_weights(model: nn.Module, path: Path) -> None:
    """Weights for the dependency-free JS backend.

    Base64 little-endian float32 (a JSON array of floats is ~5x larger and slow
    to parse at device load). Shapes are included so JS never guesses; note the
    LSTM's gate rows are stacked in PyTorch's order **i, f, g, o** — getting
    that wrong yields plausible-but-wrong chords, so it is asserted by the
    JS<->PyTorch parity fixture.
    """
    import base64

    sd = model.state_dict()
    payload = {
        "note": "base64 little-endian float32; LSTM gate row order is i,f,g,o",
        "shapes": {k: list(v.shape) for k, v in sd.items()},
        "tensors": {
            k: base64.b64encode(
                v.detach().cpu().numpy().astype("<f4").tobytes()
            ).decode("ascii")
            for k, v in sd.items()
        },
    }
    path.write_text(json.dumps(payload))


def parity_and_fixture(rnn, lstm, hid, layers, out_dir: Path, probes: list[int]) -> dict:
    """Compare ONNX against PyTorch, and capture a golden fixture for the JS tests."""
    import numpy as np
    import onnxruntime as ort

    r_sess = ort.InferenceSession(str(out_dir / "rnn.onnx"), providers=["CPUExecutionProvider"])
    l_sess = ort.InferenceSession(str(out_dir / "lstm.onnx"), providers=["CPUExecutionProvider"])
    r_step, l_step = RNNStep(rnn).eval(), LSTMStep(lstm).eval()

    fixture: dict = {"rnn": {}, "lstm": {}}
    worst_r = worst_l = 0.0
    zeros = np.zeros((layers, 1, hid), dtype=np.float32)

    with torch.no_grad():
        for tok in probes:
            t = torch.tensor([[tok]], dtype=torch.long)
            h0 = torch.zeros(layers, 1, hid)

            pl, ph = r_step(t, h0)
            ol, oh = r_sess.run(None, {"token": np.array([[tok]], dtype=np.int64), "h_in": zeros})
            worst_r = max(worst_r, np.abs(pl.numpy() - ol).max(), np.abs(ph.numpy() - oh).max())
            fixture["rnn"][str(tok)] = {"logits": ol.tolist(), "h_out": oh.flatten().tolist()}

            pl, ph, pc = l_step(t, h0, torch.zeros(layers, 1, hid))
            ol, oh, oc = l_sess.run(
                None, {"token": np.array([[tok]], dtype=np.int64), "h_in": zeros, "c_in": zeros})
            worst_l = max(worst_l, np.abs(pl.numpy() - ol).max(),
                          np.abs(ph.numpy() - oh).max(), np.abs(pc.numpy() - oc).max())
            fixture["lstm"][str(tok)] = {
                "logits": ol.tolist(), "h_out": oh.flatten().tolist(), "c_out": oc.flatten().tolist()}

    print(f"  ONNX vs PyTorch single-step: rnn {worst_r:.3e}, lstm {worst_l:.3e}")
    if max(worst_r, worst_l) > 1e-4:
        raise SystemExit(f"ABORT: ONNX parity exceeded 1e-4 (rnn {worst_r}, lstm {worst_l})")

    # Multi-step carry: drift only shows up when the hidden state is fed back.
    seq = [1, 42, 7, 100, 55]
    worst_carry = 0.0
    with torch.no_grad():
        h = torch.zeros(layers, 1, hid)
        hn, cn = zeros.copy(), zeros.copy()
        hl = torch.zeros(layers, 1, hid)
        cl = torch.zeros(layers, 1, hid)
        hn_l, cn_l = zeros.copy(), zeros.copy()
        carry = []
        for tok in seq:
            t = torch.tensor([[tok]], dtype=torch.long)
            pl, h = r_step(t, h)
            ol, hn = r_sess.run(None, {"token": np.array([[tok]], dtype=np.int64), "h_in": hn})
            worst_carry = max(worst_carry, np.abs(pl.numpy() - ol).max(), np.abs(h.numpy() - hn).max())

            pl2, hl, cl = l_step(t, hl, cl)
            ol2, hn_l, cn_l = l_sess.run(
                None, {"token": np.array([[tok]], dtype=np.int64), "h_in": hn_l, "c_in": cn_l})
            worst_carry = max(worst_carry, np.abs(pl2.numpy() - ol2).max(),
                              np.abs(hl.numpy() - hn_l).max(), np.abs(cl.numpy() - cn_l).max())
            carry.append({"token": tok, "rnn_logits": ol.tolist(), "lstm_logits": ol2.tolist()})

    print(f"  ONNX vs PyTorch {len(seq)}-step carry:  {worst_carry:.3e}")
    if worst_carry > 1e-4:
        raise SystemExit(f"ABORT: multi-step carry parity exceeded 1e-4 ({worst_carry})")

    fixture["carry"] = {"sequence": seq, "steps": carry}
    return fixture


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--jazznet", type=Path, default=JAZZNET)
    args = ap.parse_args()

    meta_path = args.jazznet / "metadata.json"
    hparams = json.loads(meta_path.read_text()).get("hyperparameters", {}) if meta_path.is_file() else {}
    hid = hparams.get("hidden_dim", 128)
    layers = hparams.get("n_layers", 2)

    vocab = load_vocab(args.jazznet / "chords.json")
    print(f"vocab: {vocab.vocab_size} tokens (pad={vocab.pad_idx} bos={vocab.bos_idx} eos={vocab.eos_idx})")

    rnn, lstm = build_models(vocab.vocab_size, hparams)
    assert_unpacked_equals_packed(lstm, vocab.vocab_size)

    onnx_dir = args.jazznet / "onnx"
    export_onnx(rnn, lstm, hid, layers, onnx_dir)
    print(f"  wrote {onnx_dir.relative_to(REPO)}/rnn.onnx, lstm.onnx (opset {OPSET})")

    # Vocab asset: JS loads this instead of re-deriving from the 2.2MB chords.json.
    (args.jazznet / "vocab.json").write_text(json.dumps({
        "vocab_size": vocab.vocab_size,
        "pad_idx": vocab.pad_idx,
        "bos_idx": vocab.bos_idx,
        "eos_idx": vocab.eos_idx,
        "idx_to_chord": [vocab.idx_to_chord[i] for i in range(vocab.vocab_size)],
    }, indent=1))

    dump_weights(rnn, args.jazznet / "weights_rnn.json")
    dump_weights(lstm, args.jazznet / "weights_lstm.json")

    probes = [vocab.bos_idx, vocab.eos_idx, 3, 7, 42, 55, 100, vocab.vocab_size - 1]
    fixture = parity_and_fixture(rnn, lstm, hid, layers, onnx_dir, probes)
    fixture["hidden_shape"] = [layers, 1, hid]
    fixture["vocab_size"] = vocab.vocab_size
    (args.jazznet / "parity_fixture.json").write_text(json.dumps(fixture))

    for name in ("vocab.json", "weights_rnn.json", "weights_lstm.json", "parity_fixture.json"):
        p = args.jazznet / name
        print(f"  wrote data/jazznet/{name} ({p.stat().st_size / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
