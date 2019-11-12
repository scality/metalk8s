"""Factories for re-usable parsers when building hierarchical commands."""
import argparse

from metalk8s_cli.__version__ import __VERSION__


def build_version_parser():
    """Using this flag will exit the program and display version information.

    TODO: provide a more interesting message (show values from product.txt?)
    """
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--version', action='version',
                        version='%(prog)s {}'.format(__VERSION__))
    return parser


def build_verbosity_parser():
    """Allow toggling verbose mode."""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('-v', '--verbose', action='count', default=0)
    return parser


def build_logfile_parser():
    """Allow defining a logfile for this command execution.

    Note that this only overrides the command-specific logfile, while all logs
    will always be stored in a file common to all commands
    (/var/log/metalk8s/metalk8s.log by default).
    Most `Command` instances will set a default value for this logfile,
    although not setting one will result in no command-specific logfile being
    written to.
    """
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('-l', '--logfile')
    return parser
