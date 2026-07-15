"""Entry point for the Markov chord OSC service."""

from __future__ import annotations

import logging
import os
import signal
import threading
import time

from .config import PROTOCOL_VERSION, load_settings
from .csv_loader import CSVLoadError
from .osc_service import MarkovOscService


def configure_logging(debug: bool) -> None:
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def start_orphan_watchdog(logger: logging.Logger) -> bool:
    """When launched by the Max device's supervisor (CHORD_SUPERVISED=1), exit
    if the parent Node process dies. A hard Max/Live crash bypasses the
    supervisor's cleanup, and an orphaned service would keep holding UDP 9000
    and break the next device load. Orphaning reparents us to launchd, so
    ppid==1 is the detector. Manual terminal launches are unaffected."""
    if os.environ.get("CHORD_SUPERVISED") != "1":
        return False

    def _watch() -> None:
        while True:
            if os.getppid() == 1:
                logger.info("parent process gone — exiting (supervised mode)")
                os._exit(0)
            time.sleep(2.0)

    threading.Thread(target=_watch, name="orphan-watchdog", daemon=True).start()
    return True


def main(argv: list[str] | None = None) -> int:
    settings = load_settings(argv)
    configure_logging(settings.debug)
    logger = logging.getLogger(__name__)
    logger.info(
        "starting chord service (Markov + JazzNet + n-gram + theory planner) protocol=%s",
        PROTOCOL_VERSION,
    )
    logger.info(
        "config model=%s csv=%s jazznet=%s epoch=%s host=%s port=%s max=%s:%s "
        "fallback=%s seed=%s neural_temp=%s neural_exclude_input=%s "
        "session_mode=%s session_max_steps=%s session_auto_feed=%s "
        "complexity=%s gravity=%s ngram=%s debug=%s",
        settings.model,
        settings.csv_path,
        settings.jazznet_dir,
        settings.jazznet_epoch,
        settings.host,
        settings.port,
        settings.max_host,
        settings.max_port,
        settings.fallback,
        settings.seed,
        settings.neural_temperature,
        settings.neural_exclude_input,
        settings.session_mode,
        settings.session_max_steps,
        settings.session_auto_feed,
        settings.complexity,
        settings.gravity,
        settings.ngram_model_path,
        settings.debug,
    )

    service = MarkovOscService(settings)
    if start_orphan_watchdog(logger):
        logger.info("supervised mode: orphan watchdog armed")

    def _shutdown(_signum: int, _frame: object) -> None:
        logger.info("shutting down")
        # stop() joins the serve loop; calling it directly from a signal
        # handler running ON that loop's thread deadlocks. Hand it off.
        threading.Thread(target=service.stop, daemon=True).start()

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    try:
        service.run_forever()
    except CSVLoadError as exc:
        logger.error("startup failed: %s", exc)
        return 1
    except OSError as exc:
        logger.error("server error: %s", exc)
        return 1
    except KeyboardInterrupt:
        logger.info("interrupted")
    finally:
        service.stop()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
