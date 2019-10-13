import json
import shlex
import subprocess

import six

from metalk8s_cli.exceptions import CommandError


class SaltCommandMixin(object):
    def __init__(self, args):
        super(SaltCommandMixin, self).__init__(args)

    def run_salt_minion(
        self, command, local=False, outputter=None, saltenv=None, pillar=None,
    ):
        full_cmd = ['salt-call']

        if local:
            full_cmd.append('--local')
        if outputter:
            full_cmd.extend(['--out', outputter])

        full_cmd.extend(self._build_args(command))

        if saltenv is not None:
            full_cmd.append('saltenv={}'.format(saltenv))
        if pillar is not None:
            full_cmd.append("pillar='{}'".format(json.dumps(pillar)))

        try:
            return subprocess.check_output(full_cmd)
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to execute "{}": {}'.format(' '.join(full_cmd), exc)
            )

    def run_salt_master(self, command):
        # TODO: add cache for the salt-master container ID
        full_cmd = [
            'crictl', 'exec', self.get_salt_master_container()
        ]
        master_cmd = ['salt-run'] + self._build_args(command)
        full_cmd.extend(master_cmd)

        try:
            return subprocess.check_output(' '.join(full_cmd), shell=True)
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to run "{}" on Salt master: {}'.format(
                    ' '.join(master_cmd), exc
                )
            )

    def get_from_pillar(self, pillar_key):
        return _get_json_from_minion('pillar.get {}'.format(pillar_key))

    def get_grain(self, grain_name, local=False):
        command = 'grains.get {}'.format(grain_name)
        return self._get_json_from_minion(command, local=local)

    def render_jinja(self, template):
        command = 'slsutil.renderer string="{}"'.format(template)
        return self._get_json_from_minion(command)

    @property
    def minion_id(self):
        # FIXME: add cache
        return self.get_grain('id', local=True)

    def get_saltenv(self):
        return "metalk8s-{}".format(
            self.render_jinja('{{ pillar.metalk8s.nodes[grains.id].version }}')
        )

    @staticmethod
    def get_salt_master_container():
        try:
            output = subprocess.check_output([
                'crictl', 'ps', '-q',
                '--label', 'io.kubernetes.container.name=salt-master'
            ])
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to find salt-master container: {}'.format(exc)
            )

        return output.strip().decode('utf-8')

    def check_role(self, role):
        """Ensure this command runs on a Node with this role."""
        minion_roles = self.render_jinja(
            '{{ pillar.metalk8s.nodes[grains.id].roles | tojson }}'
        )

        if role not in minion_roles:
            raise CommandInitError(
                "Can only run this command on a '{}' Node.".format(role)
            )

    def _build_args(self, cmd):
        if isinstance(cmd, six.string_types):
            return shlex.split(cmd)
        return cmd

    def _get_json_from_minion(self, command, **kwargs):
        out_string = self.run_salt_minion(command, outputter='json', **kwargs)
        return json.loads(out_string)["local"]
