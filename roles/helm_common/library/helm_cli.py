from contextlib import contextmanager
import json
import os
from tempfile import NamedTemporaryFile

from ansible.module_utils.basic import AnsibleModule


class Helm(AnsibleModule):

    def __init__(self, *args, **kwargs):
        AnsibleModule.__init__(
            self,
            argument_spec=dict(
                chart=dict(type='dict'),
                release=dict(type='str', aliases=['name']),
                namespace=dict(type='str'),
                binary=dict(type='str'),
                wait=dict(default=False, type='bool'),
                state=dict(default='present',
                           choice=['latest', 'present', 'absent', 'purged']),
                values=dict(type='list'),
                timeout=dict(type='int'),
            )
        )
        self._helm_bin = None
        self.delete_temp_file = True

    def get_chart(self):
        chart = self.params.get('chart')
        if chart is None:
            raise HelmError("'chart' is a mandatory argument for "
                            "state=present|latest")
        if 'name' not in chart:
            raise HelmError("'chart' argument required a 'name' key for "
                            "state=present|latest")
        return chart

    @property
    def helm_bin(self):
        if self._helm_bin is None:
            binary = self.params.get('binary')
            if binary:
                if os.path.isfile(binary) and os.access(binary, os.X_OK):
                    self._helm_bin = binary
                else:
                    raise HelmError(
                        "No executable at the specified 'binary' location")
            else:
                self._helm_bin = self.get_bin_path('helm', required=True)
        return self._helm_bin

    def get_release_info(self, release, command='get'):
        assert command in ['get', 'status']

        def failure_detect(rc, out, err):
            return not(rc == 0 or
                       'release: "{}" not found'.format(release) in err)

        rc, out, err = self._run_helm([command, release],
                                      failed_when=failure_detect)
        if rc != 0:
            return
        release_info = self._parse_helm_output(out)
        return release_info

    def install(self):
        chart = self.get_chart()
        release = self.params.get('release')
        if release is None:
            cmd = ['install', chart['name']]
        else:
            cmd = ['--install', release, 'upgrade', chart['name']]
        if 'version' in chart:
            cmd.extend(['--version', chart['version']])
        if 'repo' in chart:
            cmd.extend(['--repo', chart['repo']])
        namespace = self.params.get('namespace')
        if namespace:
            cmd.extend(['--namespace', namespace])
        timeout = self.params.get('timeout')
        if timeout is not None:
            cmd.extend(['--timeout', str(timeout)])
        if self.params.get('wait'):
            cmd.extend(['--wait'])
        with self.write_values_files() as values_filenames:
            for value in values_filenames:
                cmd.extend(['--values', value])
            rc, out, err = self._run_helm(cmd)
        return self._parse_helm_output(out)

    def _run_helm(self, cmd, failed_when=lambda rc, out, err: rc != 0):
        try:
            rc, out, err = self.run_command([self.helm_bin] + cmd)
        except Exception as exc:
            raise HelmError('error running helm {} command: {}'.format(
                ' '.join(cmd), exc))
        else:
            if failed_when(rc, out, err):
                raise HelmError(
                    'Error running helm {} command (rc={}) '
                    "out='{}' err='{}'".format(' '.join(cmd), rc, out, err))
        return rc, out, err

    def ensure_present(self):
        release = self.params.get('release')
        if release:
            release_status = self.get_release_info(release, command='status')
        else:
            release_status = None

        if release_status is None or release_status['STATUS'] != 'DEPLOYED':
            install = self.install()
            release_info = self.get_release_info(release or install['NAME'])
            return {'changed': True,
                    'release': release_info,
                    'install': install}
        elif release_status['STATUS'] == 'DEPLOYED':
            release_info = self.get_release_info(release)
            return {'changed': False,
                    'release': release_info}
        else:
            raise HelmError("Release found but it's status is not 'DEPLOYED'")

    def install_or_upgrade(self):
        install = self.install()
        release_info = self.get_release_info(
            self.params.get('release', install.get('NAME'))
        )
        return {'changed': True,
                'release': release_info}

    def remove(self, purge=False):
        release = self.params.get('release')
        if not release:
            raise HelmError(
                "'release' is a mandatory argument for state=absent")
        release_status = self.get_release_info(release, command='status')
        release_info = self.get_release_info(release)
        if release_status is None or \
                (release_status['STATUS'] == 'DELETED' and not purge):
            return {'changed': False,
                    'release': release_info}
        else:
            cmd = ['delete', release]
            if purge:
                cmd.append('--purge')
            self._run_helm(cmd)
            return {'changed': True,
                    'release': release_info}

    def execute(self):
        state = self.params.get('state')
        if state == 'present':
            return self.ensure_present()
        elif state == 'latest':
            return self.install_or_upgrade()
        elif state == 'absent':
            return self.remove()
        elif state == 'purged':
            return self.remove(purge=True)
        else:
            raise HelmError('state not supported')

    @contextmanager
    def write_values_files(self):
        values_filenames = []
        values_content = self.params.get('values', [])
        for values in values_content:
            temp = NamedTemporaryFile(
                suffix='.yaml',
                prefix='ansible.helm.values.',
                delete=False,
            )
            if isinstance(values, dict):
                values_str = json.dumps(values)
            else:
                values_str = values
            temp.write(values_str)
            temp.close()
            values_filenames.append(temp.name)
        try:
            yield values_filenames
        finally:
            if self.delete_temp_file:
                for filename in values_filenames:
                    os.remove(filename)

    def _parse_helm_output(self, helm_output):
        output_parsed = {}
        multiline_key = None
        for n, line in enumerate(helm_output.splitlines()):
            line_split = line.split(':', 1)
            try:
                (key, value) = line_split
            except ValueError:
                pass
            else:
                if key.strip().upper() == key:
                    if value.strip() == '':
                        multiline_key = key
                        output_parsed[key] = []
                        continue
                    else:
                        output_parsed[key] = value.strip()
                        multiline_key = None
                        continue
            if multiline_key is not None:
                output_parsed[multiline_key].append(line)
                continue
            if n == 0:
                output_parsed['message'] = line
                continue
            if line == '':
                continue
            raise ValueError(
                'Cannot have an unformatted line in a '
                'non-multine block: "{}" (n {})'.format(line, n)
            )
        return output_parsed


class HelmError(Exception):
    """Error from Kubectl Module"""


def main():
    module = Helm()
    try:
        res_dict = module.execute()
    except HelmError as exc:
        module.fail_json(msg=exc.args[0])
    else:
        module.exit_json(**res_dict)


if __name__ == '__main__':
    main()
