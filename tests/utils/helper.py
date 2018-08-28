import logging
import os
import subprocess

from ansible.inventory.manager import InventoryManager
from ansible.parsing.dataloader import DataLoader

from kubernetes import client as k8s_client
from kubernetes import config as k8s_config


NAMESPACED_RESOURCES = {
    'daemon_set': 'AppsV1Api',
    'deployment': 'AppsV1Api',
    'stateful_set': 'AppsV1Api',
    'job': 'BatchV1Api',
    'service': 'CoreV1Api',
}
CLUSTER_RESOURCES = {
    'persistent_volume': 'CoreV1Api'
}

def run_make_shell(args=None, tmpdir=None, **kwargs):
    make_args = []
    if tmpdir:
        make_args.append('SHELL_ENV={}'.format(tmpdir))
    if args:
        command = args
    else:
        command = 'true'
    make_args.append('C="{}"'.format(command))
    full_command = 'make shell {args}'.format(args=' '.join(make_args))
    logging.warning("Running: {}".format(full_command))
    make_process = subprocess.Popen(full_command, shell=True, **kwargs)
    make_process.wait()
    return make_process


def run_ansible_playbook(playbook, env=None, tmpdir=None):
    env_vars = dict(os.environ)
    env_vars.setdefault('ANSIBLE_FORCE_COLOR', "true")
    if env:
        env_vars.update(env)
    command = "ansible-playbook playbooks/{}".format(playbook)
    return run_make_shell(args=command, env=env_vars, tmpdir=tmpdir)


class Inventory(object):
    def __init__(self, filename):
        self._loader = DataLoader()
        self._inventory = InventoryManager(
            loader=self._loader, sources=filename)

    def __getattr__(self, key):
        return getattr(self._inventory, key)


def _find_resource_name(resource):
    for resource_name, api in NAMESPACED_RESOURCES.items():
        if resource.lower() == resource_name.replace('_', ''):
            return resource_name, api, True  # namespaced_resource
    for resource_name, api in CLUSTER_RESOURCES.items():
        if resource.lower() == resource_name.replace('_', ''):
            return resource_name, api, False  # cluster_resource
    else:
        raise ValueError('Unknown resource {} should be part of {}'.format(
            resource, NAMESPACED_RESOURCES.keys() | CLUSTER_RESOURCES.keys()))


def get_kube_resources(kubeconfig, resource, namespace='default', name=None):
    k8s_config.load_kube_config(config_file=kubeconfig)
    resource_name, api_name, namespaced_resource = _find_resource_name(resource)
    api = getattr(k8s_client, api_name)()
    if name is None:
        if namespace is None and namespaced_resource:
            resources = getattr(
                api, 'list_' + resource_name + '_all_namespaces')()
        elif namespace is not None and namespaced_resource:
            resources = getattr(api, 'list_namespaced_' + resource_name)(
                namespace=namespace)
        else:  # not namespaced_resource
            resources = getattr(api, 'list_' + resource_name)()

    else:
        if namespace is not None and namespaced_resource:
            resources = getattr(api, 'read_namespaced_' + resource_name)(
                namespace=namespace, name=name)
        elif not namespaced_resource:
            resources = getattr(api, 'read_' + resource_name)(name=name)
        else:
            raise ValueError('Cannot get a specific name, without namespace')
    return resources
