import json
import shlex
import subprocess

import six

from metalk8s_cli.exceptions import CommandInitError
from metalk8s_cli.mixins.log import LoggingCommandMixin
from metalk8s_cli import utils


class SaltCommandMixin(LoggingCommandMixin):
    def run_salt_minion(
        self, command, local=False, outputter=None, color=True,
        saltenv=None, pillar=None,
    ):
        full_cmd = ['salt-call', '--retcode-passthrough']

        if local:
            full_cmd.append('--local')
        if outputter:
            full_cmd.extend(['--out', outputter])
        if color:
            full_cmd.append('--force-color')

        full_cmd.extend(utils.build_args(command))

        if saltenv is not None:
            full_cmd.append('saltenv={}'.format(saltenv))
        if pillar is not None:
            full_cmd.append("pillar='{}'".format(json.dumps(pillar)))

        self.debug(
            'Running command "{}" on Salt minion'.format(' '.join(full_cmd))
        )
        return utils.run_process(full_cmd)

    def run_salt_master(self, command, color=True, saltenv=None, pillar=None,
                        container_id=None):
        if container_id is None:
            container_id = self.get_salt_master_container()

        full_cmd = ['crictl', 'exec', container_id, 'salt-run']

        if color:
            full_cmd.append('--force-color')

        full_cmd.extend(_build_args(command))

        if saltenv is not None:
            full_cmd.append('saltenv={}'.format(saltenv))
        if pillar is not None:
            full_cmd.append("pillar='{}'".format(json.dumps(pillar)))

        # FIXME: cannot run with list of strings through crictl, Salt fails
        # (with retcode 0, of course) with an error about Pillar data format
        # return _run_process(full_cmd)
        self.debug(
            'Running command "{}" on Salt master'.format(' '.join(full_cmd))
        )
        return utils.run_process(' '.join(full_cmd), shell=True)

    def get_from_pillar(self, pillar_key):
        return self._get_json_from_minion('pillar.get {}'.format(pillar_key))

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
        result = utils.run_process([
            'crictl', 'ps', '-q',
            '--label', 'io.kubernetes.container.name=salt-master'
        ])

        return result.stdout.strip().decode('utf-8')

    def check_role(self, role):
        """Ensure this command runs on a Node with this role."""
        minion_roles = self.render_jinja(
            '{{ pillar.metalk8s.nodes[grains.id].roles | tojson }}'
        )

        if role not in minion_roles:
            raise CommandInitError(
                "Can only run this command on a '{}' Node.".format(role)
            )

    def _get_json_from_minion(self, command, **kwargs):
        result = self.run_salt_minion(
            command, outputter='json', color=False, **kwargs
        )
        return json.loads(result.stdout)["local"]
