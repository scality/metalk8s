import contextlib
import os
import logging
import logging.config


# Filters {{{

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


class VerbosityFilter(logging.Filter):
    """Suppress log records based on their verbosity level.

    Assumes the log levels are organized using two digits, where the first
    digit describes the actual logging level, and the second marks the
    verbosity of the message. A lower verbosity will yield a higher second
    digit (so the behaviour w.r.t. criticity of the messages is similar).

    For instance:
    - DEBUG, with verbosity 0, will use the level 19
    - INFO, with verbosity 3, will use the level 26
    """
    def __init__(self, name='', verbosity=0):
        super(VerbosityFilter, self).__init__(name)
        self.verbosity = verbosity

    def filter(self, record):
        record_verbosity = 9 - (record.level % 10)
        return record_verbosity <= self.verbosity

# }}}
# Default config {{{

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
        'remove-ansi': {
            '()': RemoveANSIFilter,
        },
        'verbosity-control': {
            '()': VerbosityFilter,
            'verbosity': 0,
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'stream': 'ext://sys.stderr',
            'level': 'INFO',
            'formatter': 'console',
            'filters': ['verbosity-control'],
        },
        'common-file': {
            'class': 'logging.FileHandler',
            'level': 'DEBUG',
            'formatter': 'file',
            'filename': os.path.join(DEFAULT_LOG_DIR, 'metalk8s.log'),
            'filters': ['remove-ansi'],
        },
    },
    'root': {
        'handlers': ['console', 'common-file'],
        'level': 'DEBUG',
    },
}

# }}}
# Global methods {{{

def configure_logging(logfile=None, verbosity=0):
    """Configure logging for MetalK8s CLI.

    See `DEFAULT_CONFIG` for the default values.
    Passing a `logfile` to this method will add an extra file handler, in
    addition to the existing "metalk8s.log" in `DEFAULT_LOG_DIR`.
    `verbosity` will configure the `VerbosityFilter` used in the console
    handler.
    """
    config = copy.deepcopy(DEFAULT_CONFIG)

    if logfile is not None:
        new_file_handler = copy.deepcopy(
            config['handlers']['common-file']
        )
        new_file_handler['filename'] = os.path.abspath(logfile)

        config['handlers']['extra-file'] = new_file_handler
        config['root']['handlers'].append('extra-file')

    config['filters']['verbosity-control']['verbosity'] = verbosity

    for handler in config['handlers']:
        filename = handler.get('filename')
        if filename is not None:
            _prepare_logfile(filename)

    logging.config.dictConfig(config)

@contextlib.contextmanager
def log_session(logfile, command):
    base_msg = '--- Command "{}" {} ---\n\n'
    start = datetime.now()
    with open(logfile, 'a') as fd:
        extra_msg = 'started on {}'.format(start.strftime('%Y-%m-%d %H:%M:%S'))
        fd.write(base_msg.format(command, extra_msg))

    yield

    duration = datetime.now() - start
    with open(logfile, 'a') as fd:
        extra_msg = 'completed in {:.2f}'.format(duration.total_seconds())
        fd.write(base_msg.format(command, extra_msg))

# }}}
# Helpers {{{

def _prepare_logfile(filename):
    if os.path.exists(filename):
        return

    dirname = os.path.dirname(filename)
    if not os.path.exists(dirname):
        os.makedirs(dirname)

# }}}
