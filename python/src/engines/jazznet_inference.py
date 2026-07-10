"""Single-step next-chord inference for JazzNet models."""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

from .jazznet_vocab import JazzNetVocab


def apply_sampling_distribution(
    logits: torch.Tensor,
    *,
    vocab: JazzNetVocab,
    temperature: float = 1.0,
    exclude_indices: set[int] | None = None,
) -> torch.Tensor:
    """Build a sampling distribution from raw logits with optional temperature and masks."""
    if temperature <= 0:
        raise ValueError(f"temperature must be > 0, got {temperature}")

    scaled = logits / temperature
    probabilities = F.softmax(scaled, dim=0)

    mask = set(exclude_indices or ())
    mask.update({vocab.pad_idx, vocab.bos_idx, vocab.eos_idx})

    if mask:
        probs = probabilities.clone()
        for idx in mask:
            if 0 <= idx < probs.numel():
                probs[idx] = 0.0
        total = probs.sum()
        if total.item() <= 0:
            raise ValueError("no valid next token after applying sampling constraints")
        probabilities = probs / total

    return probabilities


def _sample_from_probabilities(
    probabilities: torch.Tensor,
    *,
    vocab: JazzNetVocab,
    generator: torch.Generator | None = None,
    max_resample: int = 10,
) -> tuple[int, float]:
    for _ in range(max_resample):
        if generator is not None:
            next_token = torch.multinomial(probabilities, 1, generator=generator).item()
        else:
            next_token = torch.multinomial(probabilities, 1).item()
        if not vocab.is_special(next_token):
            return next_token, float(probabilities[next_token].item())

    next_token = int(torch.argmax(probabilities).item())
    if vocab.is_special(next_token):
        raise ValueError("no valid next token in model output")
    return next_token, float(probabilities[next_token].item())


def forward_token(
    model: nn.Module,
    token_idx: int,
    hidden,
    *,
    rnn: bool = False,
) -> tuple[torch.Tensor, object]:
    """Run a single-token forward pass and return logits plus updated hidden state."""
    device = next(model.parameters()).device
    input_seq = torch.LongTensor([[token_idx]]).to(device)

    with torch.no_grad():
        if rnn:
            output, new_hidden = model(input_seq, hidden)
        else:
            length = torch.tensor([1])
            output, new_hidden = model(input_seq, length, hidden)

    return output[0][-1], new_hidden


def predict_from_context(
    model: nn.Module,
    context_indices: list[int],
    *,
    vocab: JazzNetVocab,
    rnn: bool = False,
    generator: torch.Generator | None = None,
    temperature: float = 1.0,
    exclude_indices: set[int] | None = None,
) -> tuple[int, float, object]:
    """Forward a token sequence and sample the next index from the final position."""
    device = next(model.parameters()).device
    input_seq = torch.LongTensor([context_indices]).to(device)

    with torch.no_grad():
        if rnn:
            output, hidden = model(input_seq)
        else:
            length = torch.tensor([len(context_indices)])
            output, hidden = model(input_seq, length)

        logits = output[0][-1]
        probabilities = apply_sampling_distribution(
            logits,
            vocab=vocab,
            temperature=temperature,
            exclude_indices=exclude_indices,
        )

    next_idx, prob = _sample_from_probabilities(
        probabilities,
        vocab=vocab,
        generator=generator,
    )
    return next_idx, prob, hidden


def predict_step(
    model: nn.Module,
    token_idx: int,
    hidden,
    *,
    vocab: JazzNetVocab,
    rnn: bool = False,
    generator: torch.Generator | None = None,
    temperature: float = 1.0,
    exclude_indices: set[int] | None = None,
) -> tuple[int, float, object]:
    """Single-token session step: forward one chord token and sample the next."""
    logits, new_hidden = forward_token(model, token_idx, hidden, rnn=rnn)
    probabilities = apply_sampling_distribution(
        logits,
        vocab=vocab,
        temperature=temperature,
        exclude_indices=exclude_indices,
    )
    next_idx, prob = _sample_from_probabilities(
        probabilities,
        vocab=vocab,
        generator=generator,
    )
    return next_idx, prob, new_hidden


def predict_next_index(
    model: nn.Module,
    context_indices: list[int],
    *,
    vocab: JazzNetVocab,
    rnn: bool = False,
    generator: torch.Generator | None = None,
    temperature: float = 1.0,
    exclude_indices: set[int] | None = None,
    max_resample: int = 10,
) -> tuple[int, float]:
    next_idx, prob, _hidden = predict_from_context(
        model,
        context_indices,
        vocab=vocab,
        rnn=rnn,
        generator=generator,
        temperature=temperature,
        exclude_indices=exclude_indices,
    )
    return next_idx, prob
