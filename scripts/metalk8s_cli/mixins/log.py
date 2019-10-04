import contextlib
import copy
from datetime import datetime
from functools import wraps
import logging
import logging.config
import os.path
import time

from metalk8s_cli.exceptions import CommandError


DEFAULT_CONFIG = {
    'version': 1,
    'formatters': {
        'console': {
            'format': '%(message)s',
        },
        'file': {
            'format': '[%(levelname)-7s - %(asctime)s] (%(name)s) %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'stream': 'ext://sys.stderr',
            'level': 'WARNING',
            'formatter': 'console',
        },
        'file': {
            'class': 'logging.FileHandler',
            'level': 'DEBUG',
            'formatter': 'file',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
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
        self.logfile = os.path.abspath(args.logfile)
        self.verbose = args.verbose
        self.prepare_logfile()
        self.configure_logging(args)

    def configure_logging(self, args):
        config = copy.deepcopy(DEFAULT_CONFIG)

        if args.debug:
            config['root']['level'] = 'DEBUG'

        config['handlers']['file']['filename'] = self.logfile

        logging.config.dictConfig(config)

    def prepare_logfile(self):
        if os.path.exists(self.logfile):
            return

        dirname = os.path.dirname(self.logfile)
        if not os.path.exists(dirname):
            os.makedirs(dirname)

        open(self.logfile, 'a').close()

    @property
    def logger(self):
        if self._logger is None:
            name = '.'.join(self.command_name.split())
            self._logger = logging.getLogger(name)
        return self._logger

    @contextlib.contextmanager
    def log_step(self, step_name):
        """Log a step execution."""
        self.print_and_log('> %s...', step_name)
        start = time.time()
        try:
            # Wrapped step should use `print_and_log` for success, and
            # raise `CommandError` in case of execution failure
            yield
        except CommandError as exc:
            duration = time.time() - start
            self.print_and_log('fail [{:.2f}s]'.format(duration))
            self.logger.error(self._format_error(exc, step_name))
            # We re-raise here for the main `run` method to interrupt execution
            raise
        else:
            duration = time.time() - start
            self.print_and_log('done [{:.2f}s]'.format(duration))

    @contextlib.contextmanager
    def log_active_run(self):
        """Open and close a section in the logfile for a command run."""
        self._init_run_log()
        try:
            # Errors should be caught and logged by the wrapped code
            yield
        finally:
            self._stop_run_log()

    def print_and_log(self, message, level=logging.INFO):
        """Print a message in stdout and log it as well.

        Note that messages with a level strictly lower than `INFO` are only
        printed if `verbose` mode is activated.

        `level` can be provided as a string (given it is registered as a
        valid levelName in `logging`) or an integer.
        """
        if isinstance(level, six.string_types):
            try:
                level = logging._nameToLevel[level]
            except KeyError:
                raise ValueError(
                    "Invalid log level requested: {}".format(level)
                )

        self.logger.log(level, message)

        if level < logging.INFO and not self.verbose:
            return

        print(message)

    def _format_error(self, error, step_name):
        """Format a subclass of `CommandError`."""
        return 'Failure while running step "{}"\n{}'.format(step_name, error)

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


def logged_step(step_name):
    """Decorate a method as being a step with logging.

    Requires the method to belong to a `Command` subclass using the
    `LoggingCommandMixin`.
    """
    def decorator(method):
        @wraps(method)
        def decorated_step(self, *args, **kwargs):
            with self.log_step(step_name):
                method(self, *args, **kwargs)
        return decorated_step
    return decorator
