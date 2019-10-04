from metalk8s_cli import utils


class DeploySolutionCommand(utils.Command):
    """Deploy a Solution's cluster-wide components.

    Namely, those components are the Admin UI, CRDs, StorageClasses, and may
    include Grafana dashboards in the future.
    """
    NAME = 'deploy'

    ARGUMENTS = {
        ('solution',): {},
        ('version',): {},
    }

    def __init__(self, args):
        pass  # TODO

    def run(self):
        # TODO
        print("Deploying solution is not implemented yet.")
