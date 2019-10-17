from __future__ import print_function
import contextlib
import copy
from datetime import datetime
import logging
import logging.config
import os.path
import re
import sys
import time

import six

from metalk8s_cli.exceptions import CommandError
from metalk8s_cli import utils


class RemoveANSIFilter(logging.Filter):
    # Credits to https://stackoverflow.com/a/14693789
    ANSI_SEQUENCE_REGEX = re.compile(r'''
        \x1b   # ESC
        [@-_]  # 7-bit C1 Fe
        [0-?]* # Parameter bytes
        [ -/]* # Intermediate bytes
        [@-~]  # Final byte
    ''', re.VERBOSE)

    @classmethod
    def _remove_ansi(cls, message):
        return cls.ANSI_SEQUENCE_REGEX.sub('', message)

    def filter(self, record):
        record.msg = self._remove_ansi(record.msg)
        return True


DEFAULT_LOG_DIR = '/var/log/metalk8s'

DEFAULT_CONFIG = {
    'version': 1,
    'formatters': {
        'console': {
            'format': '[%(levelname)s] %(message)s',
        },
        'file': {
            'format': '[%(levelname)-7s - %(asctime)s] (%(name)s) %(message)s',
        },
    },
    'filters': {
        'remove_ansi': {
            '()': RemoveANSIFilter,
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'stream': 'ext://sys.stderr',
            'level': 'WARNING',
            'formatter': 'console',
        },
        'common-file': {
            'class': 'logging.FileHandler',
            'level': 'DEBUG',
            'formatter': 'file',
            'filename': os.path.join(DEFAULT_LOG_DIR, 'metalk8s.log'),
            'filters': ['remove_ansi'],
        },
    },
    'root': {
        'handlers': ['console', 'common-file'],
        'level': 'DEBUG',
    },
}


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
        self.verbose = args.verbose
        self.prepare_logfile()
        self.configure_logging()

    def configure_logging(self):
        config = copy.deepcopy(DEFAULT_CONFIG)

        if self.logfile is not None:
            command_file_handler = copy.deepcopy(
                config['handlers']['common-file']
            )
            command_file_handler['filename'] = os.path.abspath(self.logfile)

            config['handlers']['specific-file'] = command_file_handler
            config['root']['handlers'].append('specific-file')

        logging.config.dictConfig(config)

    def prepare_logfile(self):
        if os.path.exists(self.logfile):
            return

        dirname = os.path.dirname(self.logfile)
        if not os.path.exists(dirname):
            os.makedirs(dirname)

    @property
    def logger(self):
        if self._logger is None:
            name = '.'.join(self.command_name.split())
            self._logger = logging.getLogger(name)
        return self._logger

    @contextlib.contextmanager
    def log_step(self, step_name):
        """Log a step execution."""
        self.print_and_log('> {}...'.format(step_name), keep_line=True)
        start = time.time()
        try:
            # Wrapped step should use `print_and_log` for success, and
            # raise `CommandError` in case of execution failure
            yield
        except CommandError as exc:
            duration = time.time() - start
            self.print_and_log('{} [{:.2f}s]'.format(
                utils.format_ansi('fail', color='red'), duration
            ))
            self.logger.error(self._format_error(exc, step_name))
            # We re-raise here for the main `run` method to interrupt execution
            raise
        else:
            duration = time.time() - start
            self.print_and_log('{} [{:.2f}s]'.format(
                utils.format_ansi('done', color='green'), duration
            ))

    @contextlib.contextmanager
    def log_active_run(self):
        """Open and close a section in the logfile for a command run."""
        self._init_run_log()
        try:
            # Errors should be caught and logged by the wrapped code, and
            # re-raised as `CommandError`s
            yield
        except CommandError:
            self.print_and_log('The script will now exit')
            sys.exit(1)
        finally:
            self._stop_run_log()

    def print_and_log(self, message, level=logging.INFO, keep_line=False):
        """Print a message in stdout and log it as well.

        Note that messages with a level strictly lower than `INFO` are only
        printed if `verbose` mode is activated.

        `level` can be provided as a string (given it is registered as a
        valid levelName in `logging`) or an integer.

        If `keep_line` is set to True, the print to stdout will attempt to
        keep the cursor on the same line for the next print to occur (disabled
        in verbose mode).
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

        self.logger.log(level, message)

        if level < logging.INFO and not self.verbose:
            return

        if keep_line and not self.verbose:
            print(message, end=' ')
            sys.stdout.flush()
        else:
            print(message)

    def _format_error(self, error, step_name):
        """Format a subclass of `CommandError`."""
        return 'Failure while running step "{}":\n{}'.format(
            step_name, error.format_error()
        )

    def _append_run_limit(self, message):
        with open(self.logfile, 'a') as file_handle:
            file_handle.write(
                '\n--- Command: "{}" {} ---\n\n'.format(
                    self.command_invocation,
                    message,
                )
            )

    def _init_run_log(self):
        self._run_start = datetime.now()
        self._append_run_limit("started on {}".format(
            self._run_start.strftime('%Y-%m-%d %H:%M:%S')
        ))

    def _stop_run_log(self):
        run_duration = datetime.now() - self._run_start
        self._append_run_limit("completed in {:.2f}s".format(
            run_duration.total_seconds())
        )
        self._run_start = None


