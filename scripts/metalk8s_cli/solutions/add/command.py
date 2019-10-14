from metalk8s_cli import base
from metalk8s_cli.mixins import log
from metalk8s_cli.mixins import salt


class AddSolutionCommand(salt.SaltCommandMixin, log.LoggingCommandMixin,
                         base.Command):
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
        self.check_role('bootstrap')
        self.saltenv = self.get_saltenv()

    def add_archives(self):
        for archive in self.archives:
            self.solutions_config.add_archive(archive)
        self.solutions_config.write_to_file()
        self.print_and_log(
            'Added archives ({}) to config file ({}).'.format(
                ', '.join(self.archives), self.solutions_config.filepath,
            ),
            level='DEBUG',
        )

    def run(self):
        with self.log_active_run():
            with self.log_step('Editing configuration file'):
                self.add_archives()

            with self.log_step('Mounting archives and configuring registry'):
                cmd_output = self.run_salt_minion(
                    ['state.sls', 'metalk8s.solutions.available'],
                    saltenv=self.saltenv,
                )
                self.print_and_log(cmd_output, level='DEBUG')
