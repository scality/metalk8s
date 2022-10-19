"""Logging utilities."""

import errno
import logging
import logging.handlers
import os
from pathlib import Path
from typing import Optional, Union

import coloredlogs

from metalctl import errors

BASE_LOG_DIR = Path("/var/log/metalk8s/ctl")

# Extra logging level for progress messages (WARN > PROGRESS > INFO)
# logging.INFO = 20
# logging.WARN = 30
PROGRESS = 25


def default_log_file(name: str):
    return BASE_LOG_DIR / f"{name}.log"


def prepare_log_file(value: Union[str, Path]):
    """Prepare a log file, ensuring it is writable and its parent directory exists."""
    log_file = Path(value)

    try:
        log_file.parent.mkdir(exist_ok=True)
    except OSError as exc:
        raise errors.LogFileError(
            f"Error while creating parent directory '{log_file.parent}': {exc!s}",
            exit_code=exc.errno,
        ) from exc

    if not os.access(log_file.parent, os.W_OK):
        raise errors.LogFileError(
            f"Cannot write to parent directory '{log_file.parent}'",
            exit_code=errno.EACCES,
        )

    if log_file.exists():
        if log_file.is_dir():
            raise errors.LogFileError(
                f"Log file path '{log_file}' is a directory",
                exit_code=errno.EISDIR,
            )
        if not os.access(log_file, os.W_OK):
            raise errors.LogFileError(
                f"Cannot write to log file '{log_file}'",
                exit_code=errno.EACCES,
            )

    return log_file



def setup_logging(
    logger: logging.Logger,
    log_file: Path,
    verbosity: int = 0,
    silent: bool = False,
    color: Optional[bool] = None,
) -> None:
    """Setup file and console handlers for the main logger.

    Expects `log_file` to already exist and be writable (this is ensured in the
    `_handle_log_file` function).

    If `silent`, the console handler is disabled.
    If `verbosity`, INFO (and DEBUG) logs are also printed in the console.
    All DEBUG logs (or higher) are always printed in the log file.
    """
    console_format = "%(levelname)-8s - %(message)s"
    logfile_format = "[%(asctime)s][%(name)s][%(funcName)s][%(levelname)s] %(message)s"

    file_exists = log_file.exists()
    logfile_handler = logging.handlers.RotatingFileHandler(log_file, backupCount=10)
    logfile_handler.setLevel(logging.DEBUG)
    logfile_handler.setFormatter(logging.Formatter(logfile_format))
    logger.addHandler(logfile_handler)

    logging.addLevelName(PROGRESS, "PROGRESS")

    if file_exists:
        logfile_handler.doRollover()

    if not silent:
        level = PROGRESS
        if verbosity >= 2:
            level = logging.DEBUG
        elif verbosity == 1:
            level = logging.INFO

        coloredlogs.install(
            logger=logger, level=level, fmt=console_format, isatty=color
        )

