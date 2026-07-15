"""Protocol/configuration tests for the additive v4 complexity control."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.config import (
    DEFAULT_COMPLEXITY,
    OSC_CONTROL_COMPLEXITY,
    OSC_STATUS_PROTOCOL,
    PROTOCOL_VERSION,
    Settings,
    load_settings,
)
from src.osc_service import MarkovOscService


ROOT = Path(__file__).resolve().parents[2]
CSV = ROOT / "data" / "markov_openbook.csv"
CORPORA = ROOT / "data" / "markov_corpora_t.json"


def _settings(**overrides):
    values = dict(
        csv_path=CSV,
        host="127.0.0.1",
        port=19000,
        max_host="127.0.0.1",
        max_port=19001,
        fallback="echo_input",
        debug=False,
        seed=4,
        corpora_path=CORPORA,
        complexity=DEFAULT_COMPLEXITY,
    )
    values.update(overrides)
    return Settings(**values)


def test_protocol_and_addresses_are_additive_v4_contract():
    assert PROTOCOL_VERSION == "v4"
    assert OSC_CONTROL_COMPLEXITY == "/control/complexity"
    assert OSC_STATUS_PROTOCOL == "/status/protocol"
    assert 0.0 <= DEFAULT_COMPLEXITY <= 1.0


def test_protocol_status_is_emitted_at_ready_and_on_every_ping(monkeypatch):
    service = MarkovOscService(_settings())
    service.load_table()
    sent = []
    monkeypatch.setattr(
        service,
        "_send",
        lambda address, *args: sent.append((address, args)),
    )

    service.signal_ready()
    assert (OSC_STATUS_PROTOCOL, ("v4",)) in sent

    sent.clear()
    service._handle_ping("/control/ping")
    assert (OSC_STATUS_PROTOCOL, ("v4",)) in sent


def test_cli_complexity_reaches_settings():
    settings = load_settings(
        [
            "--csv",
            str(CSV),
            "--corpora",
            str(CORPORA),
            "--complexity",
            "0.73",
            "--port",
            "19002",
            "--max-port",
            "19003",
        ]
    )
    assert settings.complexity == pytest.approx(0.73)


def test_osc_complexity_handler_clamps_and_updates_registry(monkeypatch):
    service = MarkovOscService(_settings(complexity=0.2))
    service.load_table()
    monkeypatch.setattr(service, "_send", lambda *_args: None)

    service._handle_complexity(OSC_CONTROL_COMPLEXITY, 1.7)

    assert service._get_registry().complexity == pytest.approx(1.0)


def test_bad_osc_complexity_reports_error_without_changing_state(monkeypatch):
    service = MarkovOscService(_settings(complexity=0.35))
    service.load_table()
    errors = []
    monkeypatch.setattr(service, "_emit_error", errors.append)
    monkeypatch.setattr(service, "_send", lambda *_args: None)

    service._handle_complexity(OSC_CONTROL_COMPLEXITY, "not-a-number")

    assert errors and "number" in errors[-1]
    assert service._get_registry().complexity == pytest.approx(0.35)
