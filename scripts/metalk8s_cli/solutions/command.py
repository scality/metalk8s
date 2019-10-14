from metalk8s_cli.solutions import config
from metalk8s_cli import base


class SolutionsCommand(base.Command):
    """Run commands to interact with MetalK8s Solutions."""
    NAME = 'solutions'

    PARENT_PARSERS = [config.build_solutions_config_parser]
