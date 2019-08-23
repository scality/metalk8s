'''
Various utilities to handle solution.
'''

import re
import logging
import time
import os
import yaml

import salt.utils.json
from salt.exceptions import CommandExecutionError

HAS_LIBS = True
SOLUTIONS_CONFIG_MAP = 'metalk8s-solutions'
SOLUTIONS_CONFIG_MAP_NAMESPACE = 'metalk8s-solutions'
SOLUTIONS_CONFIG_FILE = '/etc/metalk8s/solutions.yaml'
try:
    import kubernetes.client
    from kubernetes.client.rest import ApiException
    from pprint import pprint
except ImportError:
    HAS_LIBS = False

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_solutions'


def __virtual__():
    if HAS_LIBS:
        return __virtualname__
    else:
        return False, 'python kubernetes library not found'

def get_solutions_from_configmap(
        context="kubernetes-admin@kubernetes",
        kubeconfig="/etc/kubernetes/admin.conf"
        ):
    """Get list of imported solution from solutions config map.."""
    response_dict = \
    __salt__['metalk8s_kubernetes.show_configmap'](
        SOLUTIONS_CONFIG_MAP,
        namespace=SOLUTIONS_CONFIG_MAP_NAMESPACE,
        context=context,
        kubeconfig=kubeconfig,
        pretty=True, exact=True, export=True)
    # The data dict is in form dict[solutionid.attribute] = value
    # we want to convert it into dict[solutionid] = dict[attribute]=value
    solutions = {}
    if response_dict:
        if response_dict['data']:
            for k, v in response_dict['data'].items():
                sol_id, att = k.split('.')
                sol_dict = solutions.setdefault(sol_id, {})
                sol_dict[att] = v
    return solutions

def get_solutions_list_from_configfile():
    """Get list of solutions paths defined in solution.yaml."""
    solutions = {}
    if os.path.exists(SOLUTIONS_CONFIG_FILE):
        with open(SOLUTIONS_CONFIG_FILE, 'r') as fd:
            content = yaml.safe_load(fd)
            solutions_list = content.get('archives', [])
    else:
        log.exception(
            'Cannot find {}'.format(SOLUTIONS_CONFIG_FILE))
        raise CommandExecutionError()
    return solutions_list

def get_unconfigured_solutions():
    """
    Return the difference between the configmap (configured) and the config 
    file (required).
    """
    configmap_solutions_dict = get_solutions_from_configmap()
    config_file_solutions_list = get_solutions_list_from_configfile()
    result = [k for k in config_file_solutions_list
              if k not in configmap_solutions_dict]
    return result

def set_configured(
        name,
        version,
        iso_path,
        context="kubernetes-admin@kubernetes",
        kubeconfig="/etc/kubernetes/admin.conf"
        ):
    """Add solution to configmap"""
    cfg = __salt__['metalk8s_kubernetes.setup_conn'](
        context=context,
        kubeconfig=kubeconfig
    )
    api_instance = kubernetes.client.CoreV1Api()
    # recreate the configmap format
    sol_dict = {
        '{}.name'.format(name): name,
        '{}.version'.format(name): version,
        '{}.iso'.format(name): iso_path
    }
    body = {'data': sol_dict}
    try: 
        api_response = api_instance.patch_namespaced_config_map(
            SOLUTIONS_CONFIG_MAP,
            SOLUTIONS_CONFIG_MAP_NAMESPACE,
            body)
        return True
    except ApiException as exc:
        log.exception('Cannot patch configmap {}'.format(SOLUTIONS_CONFIG_MAP))
    return False

def set_unconfigured(
        solution,
        context="kubernetes-admin@kubernetes",
        kubeconfig="/etc/kubernetes/admin.conf"
        ):
    """Add solution to configmap"""
    cfg = __salt__['metalk8s_kubernetes.setup_conn'](
        context=context,
        kubeconfig=kubeconfig
    )
    api_instance = kubernetes.client.CoreV1Api()
    # recreate the configmap format
    sol_dict = {}
    for k, v in solution.items():
        sol_dict['{}.{}'.format(solution['name'], k)] = v
    # We cannot delete specific keys from the cm
    # so use a placeholder to make changes and save it insead
    response_dict = \
    __salt__['metalk8s_kubernetes.show_configmap'](
        SOLUTIONS_CONFIG_MAP,
        namespace=SOLUTIONS_CONFIG_MAP_NAMESPACE,
        context=context,
        kubeconfig=kubeconfig,
        pretty=True, exact=True, export=True)
    data = response_dict['data']
    # Now remove the solution from the placeholder
    data = {k: v for k, v in data.items() if not k in sol_dict}
    body = kubernetes.client.V1ConfigMap(
        data=data,
        api_version=response_dict['api_version'],
        binary_data=response_dict['binary_data'],
        kind=response_dict['kind'],
        metadata=response_dict['metadata'])
    body.data = data
    try: 
        api_response = api_instance.replace_namespaced_config_map(
            SOLUTIONS_CONFIG_MAP,
            SOLUTIONS_CONFIG_MAP_NAMESPACE,
            body)
        return True
    except ApiException as exc:
        log.exception('Cannot patch configmap {}'.format(SOLUTIONS_CONFIG_MAP))
    return False