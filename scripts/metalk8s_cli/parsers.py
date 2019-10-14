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
