import argparse

from metalk8s_cli import parsers
from metalk8s_cli import utils
from metalk8s_cli.solutions.command import SolutionsCommand


class Metalk8sCommand(utils.Command):
    """Run commands to interact with MetalK8s."""
    NAME = 'metalk8s'

    SUBCOMMANDS = [SolutionsCommand]  # type: ignore

    PARENT_PARSERS = [
        parsers.build_version_parser,
        parsers.build_verbosity_parser,
        parsers.build_logfile_parser,
        # Could be in KubectlMixin, but kubectl allows `--kubeconfig` at every
        # level in its invocation
        parsers.build_kubeconfig_parser,
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
