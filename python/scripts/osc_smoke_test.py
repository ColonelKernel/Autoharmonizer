#!/usr/bin/env python3
"""Send /chord/input and wait for /chord/output on localhost (Phase 1.5 smoke test)."""

from __future__ import annotations

import argparse
import subprocess
import sys
import threading
import time
from pathlib import Path

from pythonosc.dispatcher import Dispatcher
from pythonosc.osc_server import BlockingOSCUDPServer
from pythonosc.udp_client import SimpleUDPClient

PYTHON_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_DIR.parent


def _run_demo(client, messages, args) -> None:
    """Drive /control/* over the real OSC wire and tally output flavours."""
    from collections import Counter

    settings = [
        ("folk    (color 0.0, adv 0.2)", 0.0, 0.2),
        ("pop     (color 0.33, adv 0.3)", 0.33, 0.3),
        ("classical (color 0.66, adv 0.5)", 0.66, 0.5),
        ("jazz    (color 1.0, adv 0.5)", 1.0, 0.5),
        ("jazz-WILD (color 1.0, adv 1.0)", 1.0, 1.0),
    ]
    client.send_message("/control/key", ["C:maj"])
    print(f"\n--- Spice demo: next chord after {args.demo_chord!r} in C major ---")
    for label, color, adventure in settings:
        client.send_message("/control/color", [color])
        client.send_message("/control/adventure", [adventure])
        time.sleep(0.05)
        start = len(messages)
        for _ in range(args.demo_n):
            client.send_message("/chord/input", [args.demo_chord])
            time.sleep(0.002)
        time.sleep(0.15)
        outs = [p[0] for a, p in messages[start:] if a == "/chord/output"]
        top = Counter(outs).most_common(5)
        pretty = ", ".join(f"{c} {100*n/len(outs):.0f}%" for c, n in top) if outs else "(no replies)"
        print(f"  {label:32} -> {pretty}")


def main() -> int:
    parser = argparse.ArgumentParser(description="OSC smoke test for Markov chord service")
    parser.add_argument("--chord", default="G:7", help="Input chord symbol")
    parser.add_argument("--python-port", type=int, default=9000)
    parser.add_argument("--max-port", type=int, default=9001)
    parser.add_argument(
        "--csv",
        default=str(REPO_ROOT / "data" / "markov_openbook.csv"),
        help="CSV path for spawned service",
    )
    parser.add_argument(
        "--spawn-service",
        action="store_true",
        help="Start python -m src.main in background before testing",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Sweep Color/Adventure and show how the output distribution shifts",
    )
    parser.add_argument("--demo-chord", default="D:min7", help="Seed chord for --demo")
    parser.add_argument("--demo-n", type=int, default=400, help="Samples per setting for --demo")
    args = parser.parse_args()

    proc: subprocess.Popen | None = None
    if args.spawn_service:
        env = {
            **dict(__import__("os").environ),
            "MARKOV_PORT": str(args.python_port),
            "MARKOV_MAX_PORT": str(args.max_port),
            "MARKOV_SEED": "42",
        }
        proc = subprocess.Popen(
            [sys.executable, "-m", "src.main", "--csv", args.csv],
            cwd=str(PYTHON_DIR),
            env=env,
        )
        time.sleep(0.5)

    messages: list[tuple[str, tuple]] = []
    ready = threading.Event()

    def handler(address: str, *args: object) -> None:
        messages.append((address, args))
        if address in ("/status/ready", "/status/pong", "/chord/output"):
            ready.set()

    dispatcher = Dispatcher()
    dispatcher.set_default_handler(handler)
    server = BlockingOSCUDPServer(("127.0.0.1", args.max_port), dispatcher)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    client = SimpleUDPClient("127.0.0.1", args.python_port)

    try:
        client.send_message("/control/ping", [])
        if not ready.wait(timeout=3.0):
            print("FAIL: no /status/pong or /status/ready within 3s", file=sys.stderr)
            return 1

        ready.clear()
        client.send_message("/chord/input", [args.chord])
        if not ready.wait(timeout=3.0):
            print("FAIL: no /chord/output within 3s", file=sys.stderr)
            return 1

        outputs = [payload[0] for addr, payload in messages if addr == "/chord/output"]
        print(f"OK: /chord/input {args.chord!r} -> /chord/output {outputs[-1]!r}")

        if args.demo:
            _run_demo(client, messages, args)
        return 0
    finally:
        server.shutdown()
        thread.join(timeout=2.0)
        if proc is not None:
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=2)


if __name__ == "__main__":
    raise SystemExit(main())
