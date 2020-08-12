"""Copied and inspired from `unittest._log`, added in Python 3.4+"""
import collections
import contextlib
from io import StringIO
import logging


LoggingWatcher = collections.namedtuple(
    "LoggingWatcher", ["records", "output"]
)


class CapturingHandler(logging.Handler):
    def __init__(self):
        super(CapturingHandler, self).__init__()
        self.watcher = LoggingWatcher([], [])

    def flush(self):
        pass

    def emit(self, record):
        self.watcher.records.append(record)
        msg = self.format(record)
        self.watcher.output.append(msg)


LOGGING_FORMAT = "%(levelname)s | %(message)s"


@contextlib.contextmanager
def capture_logs(logger, level=logging.DEBUG, fmt=LOGGING_FORMAT):
    formatter = logging.Formatter(fmt=fmt)
    handler = CapturingHandler()
    handler.setFormatter(formatter)

    old_handlers = logger.handlers[:]
    old_level = logger.level
    old_propagate = logger.propagate
    logger.handlers = [handler]
    logger.setLevel(level)
    logger.propagate = False

    try:
        yield handler.watcher
    finally:
        logger.handlers = old_handlers
        logger.setLevel(old_level)
        logger.propagate = old_propagate


def check_captured_logs(watcher, expected_records):
    if not expected_records:
        assert watcher.records == [], \
            "Expected no logs, got:\n{}".format(
                '\n'.join(msg for msg in watcher.output)
            )
    else:
        assert len(watcher.records) == len(expected_records), \
            "Expected {} log lines, got {}. Received:\n{}".format(
                len(expected_records),
                len(watcher.records),
                '\n'.join(msg for msg in watcher.output)
            )

        for expected, actual in zip(expected_records, watcher.records):
            assert expected['level'] == actual.levelname, \
                "Invalid log level, got '{}', expected '{}'\n{}".format(
                    actual.levelname, expected['level'], actual.message
                )
            assert expected['contains'] in actual.message, \
                "Log message '{}' does not contain '{}'".format(
                    actual.message, expected['contains']
                )
