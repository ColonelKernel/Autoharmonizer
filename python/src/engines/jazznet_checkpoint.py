"""Load JazzNet checkpoint files (raw state_dict or training bundle)."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def load_checkpoint_state(checkpoint_path: Path, device) -> dict[str, Any]:
    import torch

    try:
        payload = torch.load(checkpoint_path, map_location=device, weights_only=False)
    except TypeError:
        payload = torch.load(checkpoint_path, map_location=device)

    if isinstance(payload, dict) and "model_state_dict" in payload:
        return payload["model_state_dict"]
    if isinstance(payload, dict):
        return payload
    raise ValueError(f"Unsupported checkpoint format: {checkpoint_path}")
