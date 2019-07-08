#! /bin/env python

from sos.plugins import Plugin, RedHatPlugin, UbuntuPlugin


class containerd(Plugin, RedHatPlugin, UbuntuPlugin):

    """containerd engine"""

    plugin_name = 'containerd'
    profiles = ('container',)
    packages = ('cri-tools')

    option_list = [
        ('all', 'enable capture for all containers, even containers '
            'that have terminated', 'fast', False),
        ('logs', 'capture logs for running containers', 'fast', False),
    ]

    def setup(self):
        self.add_copy_spec([
            '/etc/containerd',
            '/etc/crictl.yaml'
        ])
        self.add_copy_spec('/var/log/containers')

        subcmds = [
            'info',
            'images',
            'pods',
            'ps',
            'ps -a',
            'ps -v',
            'stats',
            'version',
        ]

        self.add_journal(units='containerd')
        self.add_cmd_output(['crictl {}'.format(s) for s in subcmds])
        self.add_cmd_output('ls -alhR /etc/cni')

        ps_cmd = 'crictl ps --quiet'
        if self.get_option('all'):
            ps_cmd = '{} -a'.format(ps_cmd)

        img_cmd = 'crictl images --quiet'
        pod_cmd = 'crictl pods --quiet'

        containers = self._get_crio_list(ps_cmd)
        images = self._get_crio_list(img_cmd)
        pods = self._get_crio_list(pod_cmd)

        for container in containers:
            self.add_cmd_output('crictl inspect {}'.format(container))
            if self.get_option('logs'):
                self.add_cmd_output('crictl logs -t {}'.format(container))

        for image in images:
            self.add_cmd_output('crictl inspecti {}'.format(image))

        for pod in pods:
            self.add_cmd_output('crictl inspectp {}'.format(pod))

    def _get_crio_list(self, cmd):
        ret = []
        result = self.get_command_output(cmd)
        if result['status'] == 0:
            for entry in result['output'].splitlines():
                if 'deprecated' not in entry[0]:
                    # Prevent the socket deprecation warning
                    # from being iterated over
                    ret.append(entry)
        return ret
