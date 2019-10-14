import json
import shlex
import subprocess

import six

from metalk8s_cli.exceptions import CommandError, CommandInitError


class SaltCommandMixin(object):
    def __init__(self, args):
        super(SaltCommandMixin, self).__init__(args)

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

        full_cmd.extend(self._build_args(command))

        if saltenv is not None:
            full_cmd.append('saltenv={}'.format(saltenv))
        if pillar is not None:
            full_cmd.append("pillar='{}'".format(json.dumps(pillar)))

        try:
            return subprocess.check_output(full_cmd, stderr=subprocess.STDOUT)
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to execute "{}" [retcode {}]:\n{}'.format(
                    ' '.join(full_cmd), exc.returncode, exc.output
                )
            )

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

        try:
            return subprocess.check_output(
                # FIXME: pillar args... need to escape?
                ' '.join(full_cmd), shell=True,
                stderr=subprocess.STDOUT,
            )
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                'Failed to run "{}" on Salt master:\n{}'.format(
                    ' '.join(master_cmd), exc.output
                )
            )

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
        out_string = self.run_salt_minion(
            command, outputter='json', color=False, **kwargs
        )
        return json.loads(out_string)["local"]
