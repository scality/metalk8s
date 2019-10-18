from metalk8s_cli import base
from metalk8s_cli.exceptions import CommandError
from metalk8s_cli.mixins import log
from metalk8s_cli.mixins import salt
from metalk8s_cli.solutions import config


class RemoveSolutionCommand(
    config.SolutionsConfigMixin,
    salt.SaltCommandMixin,
    log.LoggingCommandMixin,
    base.Command
):
    """Remove a Solution archive, and its images, from the cluster.

    This will not remove active components, though can lead to unstable
    Solutions if some containers get scheduled where an image isn't available
    in the runtime cache.
    """
    NAME = 'remove'

    ARGUMENTS = {
        ('archives',): {
            'nargs': '+'
        }
    }

    def __init__(self, args):
        super(RemoveSolutionCommand, self).__init__(args)
        self.archives = args.archives
        self.check_role('bootstrap')
        self.saltenv = self.get_saltenv()

    def remove_archives(self):
        # Get view of current state before removing anything
        available = self.get_from_pillar('metalk8s:solutions:available')
        used_archives = [
            solution['archive']
            for versions in available.values()
            for solution in versions
            if solution['active']
        ]

        for archive in self.archives:
            if archive in used_archives:
                # FIXME: make this a CommandInitError, check in __init__
                raise CommandError(
                    "Archive '{}' is in use, cannot remove it.".format(archive)
                )
            self.remove_solution_archive(archive)

        self.print_and_log(
            'Removed archives ({}) from config file.'.format(
                ', '.join(self.archives),
            ),
            level='DEBUG',
        )

    def run(self):
        with self.log_active_run():
            with self.log_step('Editing configuration file'):
                self.remove_archives()

            with self.log_step('Unmounting archives and configuring registry'):
                result = self.run_salt_minion(
                    ['state.sls', 'metalk8s.solutions.available'],
                    saltenv=self.saltenv
                )
                self.print_and_log(
                    result.stdout.decode('utf-8'),
                    level='DEBUG'
                )
