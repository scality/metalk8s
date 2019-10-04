import sys

from metalk8s_cli.exceptions import CommandError
from metalk8s_cli.mixins import log
from metalk8s_cli.mixins import salt
from metalk8s_cli import utils


class RemoveSolutionCommand(salt.SaltCommandMixin, log.LoggingCommandMixin,
                            utils.Command):
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
        self.solutions_config = args.solutions_config
        self.archives = args.archives

    def remove_archive(self, archive):
        # Write to config file
        self.solutions_config.remove_archive(archive)
        self.solutions_config.write_to_file()
        self.logger.debug('Removed archive "{}" from {} config file.'.format(
            archive, self.solutions_config.filepath
        ))

        # Unmount ISO archive
        unmounted_out = self.run_salt_minion(
            'metalk8s.solutions.unmounted',
            local=True,
            pillar={'archives': [archive]},
        )
        self.logged.debug(unmounted_out)

        # Configure registry to stop serving images from this ISO
        unconfigured_out = self.run_salt_minion(
            'metalk8s.solutions.unconfigured',
            local=True,
            pillar={'archives': [archive]}
        )
        self.logger.debug(unconfigured_out)

    def run(self):
        with self.log_active_run():
            for archive in self.archives:
                try:
                    with self.log_step('Remove archive "{}"'.format(archive)):
                        self.add_archive(archive)
                except CommandError as exc:
                    self.logger.info("The script will now exit.")
                    sys.exit(1)
