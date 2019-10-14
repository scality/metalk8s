import argparse

from metalk8s_cli import parsers
from metalk8s_cli import base


class Metalk8sCommand(base.Command):
    """Run commands to interact with MetalK8s."""
    NAME = 'metalk8s'

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
