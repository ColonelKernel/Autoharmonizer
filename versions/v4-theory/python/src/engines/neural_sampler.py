"""Shared stateless and session sampling for JazzNet engines."""

from __future__ import annotations

from typing import Callable

from .base import SampleResult
from .jazznet_inference import (
    candidate_probabilities,
    distribution_from_context,
    distribution_step,
    forward_token,
    sample_from_probabilities,
)
from .jazznet_vocab import JazzNetVocab
from .neural_session import NeuralSessionState, maybe_reset_for_max_steps


def sample_stateless(
    *,
    model,
    vocab: JazzNetVocab,
    chord: str,
    idx: int,
    rnn: bool,
    generator,
    temperature: float,
    exclude_input: bool,
    apply_fallback: Callable[[str], SampleResult],
    candidate_selector: Callable[[str, list[tuple[str, float]], str], tuple[str, float]] | None = None,
    model_name: str = "neural",
) -> SampleResult:
    context = [vocab.bos_idx, idx]
    exclude = {idx} if exclude_input else None
    try:
        probabilities, _hidden = distribution_from_context(
            model,
            context,
            vocab=vocab,
            rnn=rnn,
            generator=generator,
            temperature=temperature,
            exclude_indices=exclude,
        )
    except ValueError as exc:
        return SampleResult(
            output=None,
            probability=None,
            candidates=0,
            fallback_used=True,
            error=str(exc),
        )

    if candidate_selector is not None:
        output, prob = candidate_selector(
            chord, candidate_probabilities(probabilities, vocab=vocab), model_name
        )
        next_idx = vocab.chord_index(output)
        if next_idx is None:
            return apply_fallback(chord)
    else:
        next_idx, prob = sample_from_probabilities(
            probabilities, vocab=vocab, generator=generator
        )
        output = vocab.index_chord(next_idx)
    if output is None or output in {"pad", "<BOS>", "<EOS>"}:
        return apply_fallback(chord)

    return SampleResult(
        output=output,
        probability=prob,
        candidates=vocab.vocab_size,
        fallback_used=False,
    )


def sample_session(
    *,
    model,
    vocab: JazzNetVocab,
    session: NeuralSessionState,
    max_steps: int,
    chord: str,
    idx: int,
    rnn: bool,
    generator,
    temperature: float,
    exclude_input: bool,
    auto_feed_output: bool,
    apply_fallback: Callable[[str], SampleResult],
    candidate_selector: Callable[[str, list[tuple[str, float]], str], tuple[str, float]] | None = None,
    model_name: str = "neural",
) -> SampleResult:
    maybe_reset_for_max_steps(session, max_steps)

    exclude = {idx} if exclude_input and session.hidden is None else None

    try:
        if session.hidden is None:
            probabilities, hidden = distribution_from_context(
                model,
                [vocab.bos_idx, idx],
                vocab=vocab,
                rnn=rnn,
                generator=generator,
                temperature=temperature,
                exclude_indices=exclude,
            )
        else:
            probabilities, hidden = distribution_step(
                model,
                idx,
                session.hidden,
                vocab=vocab,
                rnn=rnn,
                generator=generator,
                temperature=temperature,
                exclude_indices=exclude,
            )
    except ValueError as exc:
        return SampleResult(
            output=None,
            probability=None,
            candidates=0,
            fallback_used=True,
            error=str(exc),
        )

    if candidate_selector is not None:
        output, prob = candidate_selector(
            chord, candidate_probabilities(probabilities, vocab=vocab), model_name
        )
        next_idx = vocab.chord_index(output)
        if next_idx is None:
            return apply_fallback(chord)
    else:
        next_idx, prob = sample_from_probabilities(
            probabilities, vocab=vocab, generator=generator
        )
        output = vocab.index_chord(next_idx)
    if output is None or output in {"pad", "<BOS>", "<EOS>"}:
        return apply_fallback(chord)

    session.token_trace.append(chord)
    session.token_trace.append(output)
    session.user_steps += 1

    final_hidden = hidden
    if auto_feed_output:
        _, final_hidden = forward_token(model, next_idx, hidden, rnn=rnn)

    session.hidden = final_hidden

    return SampleResult(
        output=output,
        probability=prob,
        candidates=vocab.vocab_size,
        fallback_used=False,
    )
