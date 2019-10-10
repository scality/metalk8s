import argparse

from metalk8s_cli.mixins import log
from metalk8s_cli.mixins import salt
from metalk8s_cli import utils


class RemoveSolutionCommand(salt.SaltCommandMixin, log.LoggingCommandMixin,
                            utils.Command):
    def __init__(self, args: argparse.Namespace) -> None: ...

    def remove_archive(self, archive: str) -> None: ...

    def run(self) -> None: ...
