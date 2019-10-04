import sys

from metalk8s_cli.exceptions import CommandError
from metalk8s_cli.mixins import log
from metalk8s_cli.mixins import salt
from metalk8s_cli import utils


class AddSolutionCommand(salt.SaltCommandMixin, log.LoggingCommandMixin,
                         utils.Command):
    """Add a Solution archive, making its images available to the cluster.

    Uses the `/etc/metalk8s/solutions.yaml` configuration file to manage
    available Solution archives.
    """
    NAME = 'add'

    ARGUMENTS = {
        ('archives',): {
            'nargs': '+'
        }
    }

    def __init__(self, args):
        super(AddSolutionCommand, self).__init__(args)
        self.solutions_config = args.solutions_config
        self.archives = args.archives

    def add_archive(self, archive):
        # Write to config file
        self.solutions_config.add_archive(archive)
        self.solutions_config.write_to_file()
        self.logger.debug('Added archive "{}" to {} config file.'.format(
            archive, self.solutions_config.filepath
        ))

        # Mount ISO archive
        mounted_out = self.run_salt_minion(
            'metalk8s.solutions.mounted',
            local=True,
            pillar={'archives': [archive]},
        )
        self.logged.debug(mounted_out)

        # Configure registry to serve images from this ISO
        configured_out = self.run_salt_minion(
            'metalk8s.solutions.configured',
            local=True,
            pillar={'archives': [archive]}
        )
        self.logger.debug(configured_out)

    def run(self):
        with self.log_active_run():
            for archive in self.archives:
                try:
                    with self.log_step('Add archive "{}"'.format(archive)):
                        self.add_archive(archive)
                except CommandError as exc:
                    self.logger.info("The script will now exit.")
                    sys.exit(1)
