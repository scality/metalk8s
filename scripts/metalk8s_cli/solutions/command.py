from metalk8s_cli.solutions.add.command import AddSolutionCommand
# from metalk8s_cli.solutions.create_env.command import (
#     CreateEnvironmentCommand,
# )
from metalk8s_cli.solutions.deploy.command import DeploySolutionCommand
# from metalk8s_cli.solutions.list.command import ListSolutionCommand
# from metalk8s_cli.solutions.prepare_env.command import (
#     PrepareEnvironmentCommand,
# )
from metalk8s_cli.solutions.remove.command import RemoveSolutionCommand

from metalk8s_cli.solutions import config
from metalk8s_cli import utils


class SolutionsCommand(utils.Command):
    """Run commands to interact with MetalK8s Solutions."""
    NAME = 'solutions'

    SUBCOMMANDS = [
        AddSolutionCommand,
        # CreateEnvironmentCommand,
        DeploySolutionCommand,
        # ListSolutionCommand,
        # PrepareEnvironmentCommand,
        RemoveSolutionCommand,
    ]

    PARENT_PARSERS = [config.build_solutions_config_parser]
