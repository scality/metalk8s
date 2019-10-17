"""Unstructured module for re-usable helpers in commands and mixins."""
from collections import namedtuple
import subprocess
import shlex

import six

from metalk8s_cli.exceptions import CommandSubprocessError


# Helpers for `subprocess` usage in `Command`s {{{
# NOTE: this is done to compensate for the missing `subprocess.run` in Python 2
CompletedProcess = namedtuple('CompletedProcess',
                              ('args', 'returncode', 'stdout', 'stderr'))


def run_process(args, **kwargs):
    """Run a command-line process using subprocess.Popen from a `Command`.

    This raises a `CommandSubprocessError` if the return code of the process
    was not 0.
    A poor man's `subprocess.run` in a Python 2 world.
    """
    kwargs.setdefault('stdout', subprocess.PIPE)
    kwargs.setdefault('stderr', subprocess.PIPE)
    process = subprocess.Popen(args, **kwargs)
    try:
        stdout, stderr = process.communicate()
    finally:
        if process.stdout is not None:
            process.stdout.close()
        if process.stderr is not None:
            process.stderr.close()

    result = CompletedProcess(
        args=args,
        returncode=process.returncode,
        stdout=stdout,
        stderr=stderr,
    )

    if result.returncode:
        raise CommandSubprocessError(**result._asdict())

    return result


def build_args(cmd):
    if isinstance(cmd, six.string_types):
        return shlex.split(cmd)
    return cmd


# }}}
# ANSI escape codes {{{
ANSI_ESCAPE_CODES = {
    'reset': '\x1b[0m',
    'decoration': {
        'bold':      '\x1b[1m',
        'underline': '\x1b[4m',
        'reversed':  '\x1b[7m',
    },
    'color': {
        'black':   '\x1b[30m',
        'red':     '\x1b[31m',
        'green':   '\x1b[32m',
        'yellow':  '\x1b[33m',
        'blue':    '\x1b[34m',
        'magenta': '\x1b[35m',
        'cyan':    '\x1b[36m',
        'white':   '\x1b[37m',
    },
    'background_color': {
        'black':   '\x1b[40m',
        'red':     '\x1b[41m',
        'green':   '\x1b[42m',
        'yellow':  '\x1b[43m',
        'blue':    '\x1b[44m',
        'magenta': '\x1b[45m',
        'cyan':    '\x1b[46m',
        'white':   '\x1b[47m',
    },
}


def format_ansi(msg, color=None, bg_color=None, decoration=None, reset=True):
    prefixes = []
    if color is not None:
        prefixes.append(ANSI_ESCAPE_CODES['color'][color])
    if bg_color is not None:
        prefixes.append(ANSI_ESCAPE_CODES['background_color'][bg_color])
    if decoration is not None:
        prefixes.append(ANSI_ESCAPE_CODES['decoration'][decoration])

    if prefixes:
        return '{prefix}{msg}{suffix}'.format(
            prefix=''.join(prefixes),
            msg=msg,
            suffix=ANSI_ESCAPE_CODES['reset'] if reset else '',
        )

    return msg


# }}}
