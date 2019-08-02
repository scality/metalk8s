#! /bin/env python

from sos.plugins import Plugin, RedHatPlugin, UbuntuPlugin
from os import path


class metalk8s(Plugin, RedHatPlugin, UbuntuPlugin):

    """Metalk8s plugin"""

    plugin_name = 'metalk8s'
    packages = ('kubernetes', 'kubernetes-master')
    profiles = ('container',)
    files = ('/etc/kubernetes/admin.conf',)

    option_list = [
        ('all', 'also collect all namespaces output separately',
            'slow', False),
        ('describe', 'capture descriptions of all kube resources',
            'fast', False),
        ('podlogs', 'capture logs for pods', 'slow', False),
    ]

    def check_is_master(self):
        return any([path.exists("/etc/kubernetes/admin.conf")])

    def setup(self):
        self.add_copy_spec('/etc/kubernetes/manifests')
        self.add_copy_spec('/var/log/pods')
        self.add_copy_spec('/var/log/metalk8s-bootstrap.log')

        services = [
            'kubelet',
        ]

        for service in services:
            self.add_journal(units=service)

        # We can only grab kubectl output from the master
        if self.check_is_master():
            kube_cmd = 'kubectl '
            if path.exists('/etc/kubernetes/admin.conf'):
                kube_cmd += '--kubeconfig=/etc/kubernetes/admin.conf'

            kube_get_cmd = 'get -o json '
            for subcmd in ['version', 'config view']:
                self.add_cmd_output('{0} {1}'.format(kube_cmd, subcmd))

            # get all namespaces in use
            namespaces_result = self.get_command_output('{0} get namespaces'.format(kube_cmd))
            kube_namespaces = [n.split()[0] for n in namespaces_result['output'].splitlines()[1:] if n]

            resources = [
                'pods',
                'deploy',
                'rc',
                'services',
                'ds',
                'cm',
            ]

            # nodes and pvs are not namespaced, must pull separately.
            # Also collect master metrics
            self.add_cmd_output([
                '{} get -o json nodes'.format(kube_cmd),
                '{} get -o json pv'.format(kube_cmd),
                '{} get --raw /metrics'.format(kube_cmd)
            ])

            for n in kube_namespaces:
                kube_namespace = '--namespace={}'.format(n)
                if self.get_option('all'):
                    kube_namespaced_cmd = '{0} {1} {2}'.format(kube_cmd, kube_get_cmd, kube_namespace)

                    self.add_cmd_output('{} events'.format(kube_namespaced_cmd))

                    for res in resources:
                        self.add_cmd_output('{0} {1}'.format(kube_namespaced_cmd, res))

                    if self.get_option('describe'):
                        # need to drop json formatting for this
                        kube_namespaced_cmd = '{0} get {1}'.format(kube_cmd, kube_namespace)
                        for res in resources:
                            r = self.get_command_output(
                                '{0} {1}'.format(kube_namespaced_cmd, res))
                            if r['status'] == 0:
                                kube_cmd_result = [k.split()[0] for k in
                                          r['output'].splitlines()[1:]]
                                for k in kube_cmd_result:
                                    kube_namespaced_cmd = '{0} {1}'.format(kube_cmd, kube_namespace)
                                    self.add_cmd_output(
                                        '{0} describe {1} {2}'.format(kube_namespaced_cmd, res, k))

                if self.get_option('podlogs'):
                    kube_namespaced_cmd = '{0} {1}'.format(kube_cmd, kube_namespace)
                    r = self.get_command_output('{} get pods'.format(kube_namespaced_cmd))
                    if r['status'] == 0:
                        pods = [p.split()[0] for p in
                                r['output'].splitlines()[1:]]
                        for pod in pods:
                            self.add_cmd_output('{0} logs {1}'.format(kube_namespaced_cmd, pod))

            if not self.get_option('all'):
                kube_namespaced_cmd = '{} get --all-namespaces=true'.format(kube_cmd)
                for res in resources:
                    self.add_cmd_output('{0} {1}'.format(kube_namespaced_cmd, res))

    def postproc(self):
        # First, clear sensitive data from the json output collected.
        # This will mask values when the 'name' looks susceptible of
        # values worth obfuscating, i.e. if the name contains strings
        # like 'pass', 'pwd', 'key' or 'token'
        env_regexp = r'(?P<var>{\s*"name":\s*[^,]*' \
            r'(pass|pwd|key|token|cred|PASS|PWD|KEY)[^,]*,\s*"value":)[^}]*'
        self.do_cmd_output_sub('kubectl', env_regexp,
                               r'\g<var> "********"')
        # Next, we need to handle the private keys and certs in some
        # output that is not hit by the previous iteration.
        self.do_cmd_private_sub('kubectl')
