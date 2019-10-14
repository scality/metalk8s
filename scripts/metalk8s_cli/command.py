import argparse
import sys

from metalk8s_cli import parsers
from metalk8s_cli import base
from metalk8s_cli.solutions.command import SolutionsCommand


# Monkey-patch for old versions of argparse
# A behaviour change was introduced in Python 2.7.9 and 3.4, which allows
# subparser to override defaults (which we use to set `args.cmd` to the actual
# `Command` subclass).
# See https://hg.python.org/cpython/rev/1a3143752db2
if sys.version_info < (2, 7, 9):
    def _call(self, parser, namespace, values, option_string=None):
        parser_name = values[0]
        arg_strings = values[1:]

        if self.dest is not argparse.SUPPRESS:
            setattr(namespace, self.dest, parser_name)

        try:
            parser = self._name_parser_map[parser_name]
        except KeyError:
            tup = parser_name, ', '.join(self._name_parser_map)
            msg = argparse._('unknown parser %r (choices: %s)') % tup
            raise argparse.ArgumentError(self, msg)

        # The necessary section to update defaults from subcommands {{{
        subnamespace, arg_strings = parser.parse_known_args(arg_strings, None)
        for key, value in vars(subnamespace).items():
            setattr(namespace, key, value)
        # }}}

        if arg_strings:
            vars(namespace).setdefault(argparse._UNRECOGNIZED_ARGS_ATTR, [])
            getattr(namespace, argparse._UNRECOGNIZED_ARGS_ATTR).extend(
                arg_strings
            )

    argparse._SubParsersAction.__call__ = _call


class Metalk8sCommand(base.Command):
    """Run commands to interact with MetalK8s."""
    NAME = 'metalk8s'

    SUBCOMMANDS = [SolutionsCommand]

    PARENT_PARSERS = [
        parsers.build_version_parser,
    ]


def main():
    """Main entrypoint for the MetalK8s CLI."""
    parents = [
        build_parser() for build_parser in Metalk8sCommand.PARENT_PARSERS
    ]
    parser = argparse.ArgumentParser(
        prog=Metalk8sCommand.NAME,
        description=Metalk8sCommand.__doc__,
        parents=parents,
    )
    Metalk8sCommand.prepare_parser(
        parser, parents=parents, prog=Metalk8sCommand.NAME
    )

    args = parser.parse_args()
    cmd = args.cmd(args)
    cmd.run()
