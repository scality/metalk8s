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


def build_kubeconfig_parser():
    """Similar to `kubectl` itself, allow passing a kubeconfig anywhere."""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--kubeconfig')
    return parser


def build_verbosity_parser():
    """Allow toggling verbose mode."""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('-v', '--verbose', action='store_true')
    return parser


def build_logfile_parser():
    """Allow defining a logfile for this command execution."""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--logfile',
                        default='/var/log/metalk8s/kubectl_plugin.log')
    return parser
