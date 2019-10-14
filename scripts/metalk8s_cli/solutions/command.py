import os.path

from metalk8s_cli import base
from metalk8s_cli.mixins import log
from metalk8s_cli.solutions import config


class SolutionsCommand(base.Command):
    """Run commands to interact with MetalK8s Solutions."""
    NAME = 'solutions'

    PARENT_PARSERS = [config.build_solutions_config_parser]

    DEFAULTS = {
        'logfile': os.path.join(log.DEFAULT_LOG_DIR, 'solutions.log'),
    }
