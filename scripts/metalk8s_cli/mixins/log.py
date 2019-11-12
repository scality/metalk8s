from __future__ import print_function
import contextlib
import logging
import logging.config
import sys
import time

import six

from metalk8s_cli.exceptions import CommandError
from metalk8s_cli import log
from metalk8s_cli import utils

class LoggingCommandMixin(object):
    """Provide methods to log messages from a command.

    Always log to a file, and log partial info to the console.
    A logging command should rely on its `log_active_run` and `log_step`
    context managers within its `run` method.
    """
    def __init__(self, args):
        super(LoggingCommandMixin, self).__init__(args)
        self._logger = None
        self.logfile = args.logfile
        self.verbosity = args.verbosity
        log.configure_logging(self.logfile, self.verbosity)

    @property
    def logger(self):
        if self._logger is None:
            name = '.'.join(self.command_name.split())
            self._logger = logging.getLogger(name)
        return self._logger

    @contextlib.contextmanager
    def log_step(self, step_name):
        """Log a step execution."""
        self.print('> {}...'.format(step_name), keep_line=True)
        self.info('Starting step "{}"'.format(step_name), verbosity=9)
        start = time.time()
        try:
            # Wrapped step should use `print_and_log` for success, and
            # raise `CommandError` in case of execution failure
            yield
        except CommandError as exc:
            duration = time.time() - start
            self.print('{} [{:.2f}s]'.format(
                utils.format_ansi('fail', color='red'), duration
            ))
            self.error('Step "{}" failed (after {:.2f} seconds)'.format(
                step_name, duration
            ), verbosity=9)
            self.error(exc.format_error())
            # We re-raise here for the main `run` method to interrupt execution
            raise
        else:
            duration = time.time() - start
            self.print('{} [{:.2f}s]'.format(
                utils.format_ansi('done', color='green'), duration
            ))
            self.info('Step "{}" succeeded (after {:.2f} seconds)'.format(
                step_name, duration
            ), verbosity=9)

    @contextlib.contextmanager
    def log_active_run(self):
        """Open and close a section in the logfile for a command run."""
        with log.log_session(self.logfile, self.command_invocation):
            try:
                # Errors should be caught and logged by the wrapped code, and
                # re-raised as `CommandError`s
                yield
            except CommandError:
                self.warn('The script will now exit')
                sys.exit(1)

    def print(self, message, keep_line=False):
        """Print a message in stdout.

        If `keep_line` is set to True, the print to stdout will attempt to
        keep the cursor on the same line for the next print to occur (if
        verbosity is higher than 0, this behaviour is disabled).
        """
        if keep_line and self.verbosity == 0:
            print(message, end=' ')
            sys.stdout.flush()
        else:
            print(message)

    def log(self, level, message, *args, verbosity=0, **kwargs):
        """Log a message through `self.logger`, adjusting verbosity.

        A higher `verbosity` (between 0 and 9) will imply a lower logging
        level, and this will be used in the configured handlers.
        See `metalk8s_cli.log.VerbosityFilter` for more details.

        `level` can be provided as a string (given it is registered as a
        valid levelName in `logging`) or an integer.
        """
        if isinstance(level, six.string_types):
            # For some reason, that's the only stable API to retrieve a level
            # number from its name...
            result = logging.getLevelName(level)
            if not isinstance(result, int):
                raise ValueError(
                    "Invalid log level requested: {}".format(level)
                )
            level = result

        # Log levels from logging are integers, 10 apart from each other
        # By default, a log(logging.INFO, ...) will actually log at INFO + 9
        # Verbosity is then set as a negative offset from this value.
        assert isinstance(verbosity, int), "`verbosity` must be an integer"
        assert 0 <= verbosity <= 9, "`verbosity` must be between 0 and 9"

        actual_level = level + 9 - verbosity
        self.logger.log(actual_level, message, *args, **kwargs)

    def debug(self, message, *args, verbosity=0, **kwargs):
        self.log(logging.DEBUG, message, *args,
                 verbosity=verbosity, **kwargs)

    def info(self, message, *args, verbosity=0, **kwargs):
        self.log(logging.INFO, message, *args,
                 verbosity=verbosity, **kwargs)

    def warn(self, message, *args, verbosity=0, **kwargs):
        self.log(logging.WARNING, message, *args,
                 verbosity=verbosity, **kwargs)

    def error(self, message, *args, verbosity=0, **kwargs):
        self.log(logging.ERROR, message, *args,
                 verbosity=verbosity, **kwargs)
