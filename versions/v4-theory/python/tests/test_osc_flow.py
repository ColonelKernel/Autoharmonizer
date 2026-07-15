"""OSC integration tests (localhost UDP)."""

from __future__ import annotations

import socket
import threading
import time
from pathlib import Path

import pytest
from pythonosc.dispatcher import Dispatcher
from pythonosc.osc_server import BlockingOSCUDPServer
from pythonosc.udp_client import SimpleUDPClient

from src.config import Settings
from src.osc_service import MarkovOscService

REPO_ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = REPO_ROOT / "data" / "markov_openbook.csv"
CORPORA_PATH = REPO_ROOT / "data" / "markov_corpora_t.json"
PHRASE_MODEL_PATH = REPO_ROOT / "data" / "phrase_model_jazznet.json"


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _make_service(received: dict, ready: threading.Event, *, corpora_path=None,
                  phrase_model_path=None):
    python_port = _free_port()
    max_port = _free_port()

    settings = Settings(
        csv_path=CSV_PATH,
        host="127.0.0.1",
        port=python_port,
        max_host="127.0.0.1",
        max_port=max_port,
        fallback="echo_input",
        debug=True,
        seed=42,
        corpora_path=corpora_path,
        phrase_model_path=phrase_model_path,
    )
    service = MarkovOscService(settings)

    def handler(address: str, *args: object) -> None:
        received["messages"].append((address, args))
        if address in ("/status/ready", "/status/pong"):
            ready.set()

    dispatcher = Dispatcher()
    dispatcher.set_default_handler(handler)
    max_server = BlockingOSCUDPServer(("127.0.0.1", max_port), dispatcher)
    max_thread = threading.Thread(target=max_server.serve_forever, daemon=True)
    max_thread.start()

    service_thread = threading.Thread(target=service.run_forever, daemon=True)
    service_thread.start()

    client = SimpleUDPClient("127.0.0.1", python_port)
    deadline = time.time() + 5.0
    while time.time() < deadline and not ready.is_set():
        client.send_message("/control/ping", [])
        time.sleep(0.05)
    assert ready.wait(timeout=3.0), "service did not become ready"
    return client, service, max_server, service_thread, max_thread


@pytest.fixture
def osc_service():
    received: dict[str, list] = {"messages": []}
    ready = threading.Event()
    client, service, max_server, s_thread, m_thread = _make_service(received, ready)
    yield client, received
    service.stop()
    max_server.shutdown()
    s_thread.join(timeout=2.0)
    m_thread.join(timeout=2.0)


@pytest.fixture
def osc_service_blend():
    received: dict[str, list] = {"messages": []}
    ready = threading.Event()
    client, service, max_server, s_thread, m_thread = _make_service(
        received, ready, corpora_path=CORPORA_PATH
    )
    yield client, received
    service.stop()
    max_server.shutdown()
    s_thread.join(timeout=2.0)
    m_thread.join(timeout=2.0)


@pytest.fixture
def osc_service_phrase():
    received: dict[str, list] = {"messages": []}
    ready = threading.Event()
    client, service, max_server, s_thread, m_thread = _make_service(
        received, ready, phrase_model_path=PHRASE_MODEL_PATH
    )
    yield client, received
    service.stop()
    max_server.shutdown()
    s_thread.join(timeout=2.0)
    m_thread.join(timeout=2.0)


def _await_address(received, address, timeout=3.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        for addr, args in received["messages"]:
            if addr == address:
                return args
        time.sleep(0.02)
    raise AssertionError(f"no {address} within {timeout}s: {received['messages']}")


def test_phrase_request_round_trip(osc_service_phrase):
    """The wire contract the Max device depends on: alternating chord/duration
    args whose durations sum to bars * 4."""
    client, received = osc_service_phrase
    client.send_message("/phrase/request", ["C:maj", 4, 1.0])
    args = _await_address(received, "/phrase/output")

    assert len(args) % 2 == 0 and len(args) >= 4
    chords = [args[i] for i in range(0, len(args), 2)]
    durs = [args[i] for i in range(1, len(args), 2)]
    assert all(isinstance(c, str) and ":" in c for c in chords), chords
    assert all(isinstance(d, int) and d > 0 for d in durs), durs
    assert sum(durs) == 16, durs
    assert chords[-1] == "C:maj7", chords  # resolved home


def test_phrase_request_in_minor_key(osc_service_phrase):
    client, received = osc_service_phrase
    client.send_message("/phrase/request", ["A:min", 2, 1.0])
    args = _await_address(received, "/phrase/output")
    chords = [args[i] for i in range(0, len(args), 2)]
    durs = [args[i] for i in range(1, len(args), 2)]
    assert sum(durs) == 8
    assert chords[-1] == "A:min7", chords


def test_phrase_request_bad_args_errors_but_service_survives(osc_service_phrase):
    """A malformed request must emit /error, not kill the OSC server thread."""
    client, received = osc_service_phrase
    client.send_message("/phrase/request", ["C:maj", 999])  # bars out of range
    _await_address(received, "/error")
    # still alive:
    client.send_message("/phrase/request", ["C:maj", 2, 1.0])
    args = _await_address(received, "/phrase/output")
    assert sum(args[i] for i in range(1, len(args), 2)) == 8


def test_phrase_request_without_model_reports_error(osc_service):
    """The default fixture loads no phrase model: the verb must degrade."""
    client, received = osc_service
    client.send_message("/phrase/request", ["C:maj", 4, 1.0])
    args = _await_address(received, "/error")
    assert "phrase model" in str(args[0])


def test_ping_pong(osc_service):
    client, received = osc_service
    before = len(received["messages"])
    client.send_message("/control/ping", [])
    time.sleep(0.2)
    new_messages = received["messages"][before:]
    addresses = [item[0] for item in new_messages]
    assert "/status/pong" in addresses


def test_chord_input_output(osc_service):
    client, received = osc_service
    before = len(received["messages"])
    client.send_message("/chord/input", ["G:7"])
    time.sleep(0.2)

    outputs = [
        args[0]
        for addr, args in received["messages"][before:]
        if addr == "/chord/output"
    ]
    assert outputs, "expected /chord/output"
    assert isinstance(outputs[-1], str)


def test_unknown_chord_error_and_echo(osc_service):
    client, received = osc_service
    before = len(received["messages"])
    client.send_message("/chord/input", ["X:???"])
    time.sleep(0.2)

    new_messages = received["messages"][before:]
    errors = [args[0] for addr, args in new_messages if addr == "/error"]
    outputs = [args[0] for addr, args in new_messages if addr == "/chord/output"]
    assert errors
    assert outputs[-1] == "X:???"


# --- Spice control messages (blend mode) -------------------------------------

def _send_and_collect(client, received, address, args, addr_filter="/chord/output"):
    before = len(received["messages"])
    client.send_message(address, args)
    time.sleep(0.2)
    return [
        a[0]
        for addr, a in received["messages"][before:]
        if addr == addr_filter
    ]


def test_control_messages_do_not_error(osc_service_blend):
    client, received = osc_service_blend
    before = len(received["messages"])
    client.send_message("/control/color", [0.8])
    client.send_message("/control/adventure", [0.6])
    client.send_message("/control/spice", [0.5])
    client.send_message("/control/key", ["G:maj"])
    time.sleep(0.2)
    errors = [a[0] for addr, a in received["messages"][before:] if addr == "/error"]
    assert not errors, errors


def test_color_shifts_output_distribution(osc_service_blend):
    client, received = osc_service_blend
    client.send_message("/control/key", ["C:maj"])
    client.send_message("/control/adventure", [0.5])

    # Jazz color: D:min7 should resolve to G:7 (openbook ii-V).
    client.send_message("/control/color", [1.0])
    time.sleep(0.1)
    jazz = [
        _send_and_collect(client, received, "/chord/input", ["D:min7"])[-1]
        for _ in range(12)
    ]
    assert "G:7" in jazz, jazz


def test_debug_mix_emitted(osc_service_blend):
    client, received = osc_service_blend
    mixes = _send_and_collect(
        client, received, "/chord/input", ["G:7"], addr_filter="/debug/mix"
    )
    assert mixes and isinstance(mixes[-1], str)


def test_invalid_color_value_errors(osc_service_blend):
    client, received = osc_service_blend
    before = len(received["messages"])
    client.send_message("/control/color", ["not-a-number"])
    time.sleep(0.2)
    errors = [a[0] for addr, a in received["messages"][before:] if addr == "/error"]
    assert errors
