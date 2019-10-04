import json
import shlex
import subprocess

import six

from metalk8s_cli.exceptions import CommandError


class SaltCommandMixin(object):
    def __init__(self, args):
        super(SaltCommandMixin, self).__init__(args)
        self.check_on_bootstrap()

    def run_salt_minion(self, cmd):
        full_cmd = self.build_cmd('salt-call', cmd)
        try:
            return subprocess.check_output(full_cmd)
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to execute "{}": {}'.format(' '.join(full_cmd), exc)
            )

    def get_from_pillar(self, pillar_key):
        cmd = '--out json pillar.get {}'.format(pillar_key)
        out_string = self.run_salt_minion(cmd)
        return json.loads(out_string)["local"]

    def get_grain(self, grain_name, local=False):
        options = ['--out json']
        if local:
            options.append('--local')

        command = '{} grains.get {}'.format(' '.join(options), grain_name)
        out_string = self.run_salt_minion(command)

        return json.loads(out_string)["local"]

    def run_salt_master(self, cmd):
        full_cmd = ['crictl', 'exec', self.get_salt_master_container()]
        master_cmd = self.build_cmd('salt-run', cmd)
        full_cmd.extend(master_cmd)
        try:
            return subprocess.check_output(full_cmd)
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to run "{}" on Salt master: {}'.format(
                    ' '.join(master_cmd), exc
                )
            )

    def build_cmd(self, executable, cmd):
        args = [executable]
        if isinstance(cmd, six.string_types):
            args.extend(shlex.split(cmd))
        else:
            args.extend(cmd)
        return args

    @property
    def saltenv(self):
        cluster_version = self.get_from_pillar('metalk8s:cluster_version')
        # TODO: assert cluster version matches local Node version annotation
        return "metalk8s-{}".format(cluster_version)

    @staticmethod
    def get_salt_master_container():
        # FIXME: why bother with crictl, since ext_pillars require to have K8s
        # API available?
        try:
            return subprocess.check_output([
                'crictl', 'ps', '-q',
                '--label', 'io.kubernetes.container.name=salt-master'
            ])
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to find salt-master container: {}'.format(exc)
            )

    def check_on_bootstrap(self):
        """Ensure this command runs on a Bootstrap node."""
        minion_id = self.get_grain('id', local=True)
        minion_roles = self.get_from_pillar(
            'metalk8s:nodes[{}]:version'.format(minion_id)
        )

        if not 'bootstrap' in minion_roles:
            raise CommandInitError(
                "Can only run this command on a Bootstrap node."
            )
