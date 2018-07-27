'''Various inventory validation checks, and an Ansible `Action` to run them'''

import sys
import inspect

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
    ensemble_size = len(task_vars['groups']['etcd'])

    assert ensemble_size % 2 == 1, \
        'etcd ensemble size should be odd, currently {}'.format(ensemble_size)

    assert ensemble_size >= 1, 'No `etcd` node(s) defined'


def check_at_least_one_master(task_vars):
    masters = task_vars['groups']['kube-master']

    assert len(masters) >= 1, 'No `kube-master` node(s) defined'


def check_at_least_one_node(task_vars):
    nodes = task_vars['groups']['kube-node']

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
                # A host can have e.g. `access_ip` and `ansible_host` set to the
                # same value, which would be legal.
                # The code below relies on the assumption that any address in
                # `this_host_addresses` was already checked against
                # `seen_addresses` before.
                if address not in this_host_addresses and address in seen_addresses:
                    yield 'Duplicate address in `{}` of {}: {}'.format(
                        name, host, address)

                this_host_addresses.add(address)
                seen_addresses.add(address)


def check_no_old_storage_configuration(task_vars):
    '''
    Check that the storage configuration of MetalK8s < 0.2.0 is not present
    anymore
    '''

    for host in task_vars['hostvars'].keys():
        assert 'metal_k8s_lvm' not in task_vars['hostvars'][host], (
            "You are still having the old storage configuration for {host}. "
            "A breaking change was introduced in MetalK8s 0.2.0 "
            "and the default LVM Volume Group has been changed "
            "from 'kubevg' to {metalk8s_lvm_default_vg}."
            "Please follow the 'Upgrading from MetalK8s < 0.2.0' "
            "chapter of the documentation").format(
                host=host,
                metalk8s_lvm_default_vg=task_vars['hostvars']
                                                 ['metalk8s_lvm_default_vg'],
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
                        exc.args[0] if len(exc.args) >= 1 else 'Unknown failure',
                        name)
                )

        result['failed'] = failed
        result['errors'] = errors

        return result
