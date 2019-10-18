"""Helper module for managing a SolutionsConfiguration file."""
import argparse
import os.path

import yaml

from metalk8s_cli.exceptions import CommandInitError, CommandError
from metalk8s_cli.mixins import salt


class SolutionsConfigMixin(salt.SaltCommandMixin):
    """Command mixin for manipulating the Solutions config file."""
    def __init__(self, args):
        super(SolutionsConfigMixin, self).__init__(args)
        self._check_config()

    def _check_config(self):
        self.run_salt_minion(
            ['metalk8s_solutions.read_config', 'create=True'],
            local=True,
        )

    def add_solution_archive(self, archive):
        self.run_salt_minion(
            ['metalk8s_solutions.configure_archive',
             'archive={}'.format(archive)],
            local=True,
        )

    def remove_solution_archive(self, archive):
        self.run_salt_minion(
            ['metalk8s_solutions.configure_archive',
             'archive={}'.format(archive),
             'removed=True'],
            local=True,
        )

    def activate_solution_version(self, solution, version):
        self.run_salt_minion(
            ['metalk8s_solutions.activate_solution',
             'solution={}'.format(solution),
             'version={}'.format(version)],
            local=True,
        )

    def deactivate_solution(self, solution):
        self.run_salt_minion(
            ['metalk8s_solutions.deactivate_solution',
             'solution={}'.format(solution)],
            local=True,
        )
