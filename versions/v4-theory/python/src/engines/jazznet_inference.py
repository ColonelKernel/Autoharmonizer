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


def sample_from_probabilities(
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


# Backward-compatible private name retained for existing imports/tests.
_sample_from_probabilities = sample_from_probabilities


def candidate_probabilities(
    probabilities: torch.Tensor, *, vocab: JazzNetVocab
) -> list[tuple[str, float]]:
    """Materialize every valid chord token for shared theory reranking."""
    out: list[tuple[str, float]] = []
    for index in range(probabilities.numel()):
        if vocab.is_special(index):
            continue
        label = vocab.index_chord(index)
        probability = float(probabilities[index].item())
        if label is not None and probability > 0:
            out.append((label, probability))
    return out


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


def distribution_from_context(
    model: nn.Module,
    context_indices: list[int],
    *,
    vocab: JazzNetVocab,
    rnn: bool = False,
    generator: torch.Generator | None = None,
    temperature: float = 1.0,
    exclude_indices: set[int] | None = None,
) -> tuple[torch.Tensor, object]:
    """Forward context once and return its immutable proposal distribution."""
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

    return probabilities, hidden


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
    probabilities, hidden = distribution_from_context(
        model,
        context_indices,
        vocab=vocab,
        rnn=rnn,
        generator=generator,
        temperature=temperature,
        exclude_indices=exclude_indices,
    )
    next_idx, prob = sample_from_probabilities(
        probabilities, vocab=vocab, generator=generator
    )
    return next_idx, prob, hidden


def distribution_step(
    model: nn.Module,
    token_idx: int,
    hidden,
    *,
    vocab: JazzNetVocab,
    rnn: bool = False,
    generator: torch.Generator | None = None,
    temperature: float = 1.0,
    exclude_indices: set[int] | None = None,
) -> tuple[torch.Tensor, object]:
    """Forward one session token once without choosing or mutating session state."""
    logits, new_hidden = forward_token(model, token_idx, hidden, rnn=rnn)
    probabilities = apply_sampling_distribution(
        logits,
        vocab=vocab,
        temperature=temperature,
        exclude_indices=exclude_indices,
    )
    return probabilities, new_hidden


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
    probabilities, new_hidden = distribution_step(
        model,
        token_idx,
        hidden,
        vocab=vocab,
        rnn=rnn,
        generator=generator,
        temperature=temperature,
        exclude_indices=exclude_indices,
    )
    next_idx, prob = sample_from_probabilities(
        probabilities, vocab=vocab, generator=generator
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
