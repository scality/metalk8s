'''Various inventory validation checks, and an Ansible `Action` to run them'''

import inspect
import re
import sys

from ansible.plugins.action import ActionBase

# Note: to add mode checks/validations, simply add a top-level function whose
# name starts with `check_`. The function will receive a `task_vars` dictionary
# as defined by Ansible.
# Within a `check_*` function, use `assert` to validate values found in
# `task_vars`, or raise `AssertionError` explicitly. A single check can, of
# course, contain multiple assertions.
# Alternatively, for checks which can result in multiple errors, a check can
# return a list of (or yield) error messages.


def check_etcd_ensemble_size(task_vars):
    ensemble_size = len(task_vars['groups'].get('etcd', []))

    assert ensemble_size % 2 == 1, \
        'etcd ensemble size should be odd, currently {}'.format(ensemble_size)

    assert ensemble_size >= 1, 'No `etcd` node(s) defined'


def check_at_least_one_master(task_vars):
    masters = task_vars['groups'].get('kube-master', [])

    assert len(masters) >= 1, 'No `kube-master` node(s) defined'


def check_at_least_one_node(task_vars):
    nodes = task_vars['groups'].get('kube-node', [])

    assert len(nodes) >= 1, 'No `kube-node` node(s) definend'


def check_k8s_cluster_is_kube_master_union_kube_node(task_vars):
    kube_master = set(task_vars['groups']['kube-master'])
    kube_node = set(task_vars['groups']['kube-node'])
    k8s_cluster = set(task_vars['groups']['k8s-cluster'])

    assert kube_master.union(kube_node) == k8s_cluster, \
        'The `k8s-cluster` group must be the union of `kube-master` and ' \
        '`kube-node`'


def check_no_duplicate_addresses(task_vars):
    seen_addresses = set()

    for host in task_vars['groups']['all']:
        this_host_addresses = set()

        for name in ['access_ip', 'ip', 'ansible_host']:
            address = task_vars['hostvars'][host].get(name)

            if address:
                # A host can have e.g. `access_ip` and `ansible_host` set to
                # the same value, which would be legal.
                # The code below relies on the assumption that any address in
                # `this_host_addresses` was already checked against
                # `seen_addresses` before.
                if address not in this_host_addresses \
                        and address in seen_addresses:
                    yield 'Duplicate address in `{}` of {}: {}'.format(
                        name, host, address)

                this_host_addresses.add(address)
                seen_addresses.add(address)


def check_no_old_storage_configuration(task_vars):
    '''Ensure MetalK8s 0.1 storage configuration is not present'''

    for host in task_vars['hostvars'].keys():
        assert 'metal_k8s_lvm' not in task_vars['hostvars'][host], (
            "You are still having the old storage configuration for {host}. "
            "A breaking change was introduced in MetalK8s 0.2.0 "
            "and the default LVM Volume Group has been changed "
            "from 'kubevg' to '{metalk8s_lvm_default_vg}'. "
            "Please follow the 'Upgrading from MetalK8s < 0.2.0' "
            "chapter of the documentation").format(
                host=host,
                metalk8s_lvm_default_vg=task_vars['hostvars'][host].get(
                    'metalk8s_lvm_default_vg', 'vg_metalk8s')
        )


def check_ansible_user_is_not_root(task_vars):
    '''Ensure `ansible_user` is not `root`

    As part of the deployment, SSH login using the `root` user is disabled
    (STIG rule V-2247). Since this could cause a system to be no longer
    accessible, we make sure the `root` user is not used to deploy the system.

    See:
    https://www.stigviewer.com/stig/red_hat_enterprise_linux_7/2017-12-14/finding/V-72247
    See: https://github.com/scality/metalk8s/issues/329
    '''

    for (host, hostvars) in sorted(task_vars['hostvars'].items()):
        if hostvars.get('ansible_user', None) == 'root' and \
                not hostvars.get('security_sshd_permit_root_login', False):
            yield (
                "Using 'root' as 'ansible_user' for host '{host}'. "
                "This is not permitted.").format(
                    host=host,
            )


def check_valid_fqdn_and_no_capital_letter_in_hostnames(task_vars):
    '''Ensure there is only lower case hostnames in the inventory

    Kubespray set the hostname with lower case based on the inventory content
    but this breaks calico, therefore we should enforce the usage of lower
    letter only in the hostnames defined in the inventory
    Kubespray uses the `inventory_hostname` variable
    We also check that the hostname matches the RFC described at
    https://tools.ietf.org/html/rfc1035
    '''

    fqdn_regex = re.compile(
        r'^((?!-)[-a-z\d]{1,62}(?<!-)\.)*(?!-)[-a-z\d]{1,62}(?<!-)$',
        re.IGNORECASE
    )
    for host, hostvars in sorted(task_vars['hostvars'].items()):
        if fqdn_regex.match(host) is None:
            yield (
                "The hostname {host} does not match a valid FQDN. "
                "See https://tools.ietf.org/html/rfc1035#section-2.3.1 "
                "for more details.".format(host=host)
            )
        if any([letter.isupper() for letter in host]):
            yield (
                "The hostname {host} contains capital letter. "
                "Please rename it to {host_lower} in your "
                "inventory {inventory}.".format(
                    host=host,
                    host_lower=host.lower(),
                    inventory=hostvars.get('inventory_file', '')
                )
            )


class ActionModule(ActionBase):
    def run(self, tmp=None, task_vars=None):
        if task_vars is None:
            task_vars = {}

        result = super(ActionModule, self).run(tmp, task_vars)

        def collect_checks():
            for (name, obj) in inspect.getmembers(sys.modules[__name__]):
                if name.startswith('check_') and inspect.isfunction(obj):
                    yield (name, obj)

        errors = []
        failed = False

        for (name, check) in collect_checks():
            try:
                results = check(task_vars)
                if not results:
                    # Simple `assert`-check, passed and returned `None`
                    results = []

                for message in results:
                    failed = True
                    errors.append('{} [{}]'.format(message, name))

            except AssertionError as exc:
                failed = True
                errors.append(
                    '{} [{}]'.format(
                        exc.args[0] if len(exc.args) >= 1
                        else 'Unknown failure',
                        name)
                )

        result['failed'] = failed
        result['errors'] = errors

        return result
