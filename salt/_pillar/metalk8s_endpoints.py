"""Store data about bootstrap services ip/port in pillar"""

import logging
import os.path


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_endpoints'


def __virtual__():
    if 'metalk8s_kubernetes.show_endpoint' not in __salt__:
        return False, 'Missing metalk8s_kubernetes module'
    else:
        return __virtualname__


def service_endpoints(service, kubeconfig):
    try:
        endpoint = __salt__['metalk8s_kubernetes.show_endpoint'](
            name=service,
            namespace="kube-system",
            kubeconfig=kubeconfig,
        )

        if not endpoint:
            log.info('Endpoint not found: %s', service)
            return {}

        # Extract hostname, ip and node_name
        res = {
            k: v
            for k, v in endpoint['subsets'][0]['addresses'][0].items()
            if k in ['hostname', 'ip', 'node_name']
        }

        # Add ports info to res dict
        ports = {
            port['name']: port['port']
            for port in endpoint['subsets'][0]['ports']
        }
        res['ports'] = ports
    except Exception as exc:  # pylint: disable=broad-except
        log.exception(
            'Unable to get kubernetes endpoints for %s:\n%s', service, exc
        )
        return {}
    else:
        return res


def ext_pillar(minion_id, pillar, kubeconfig):
    endpoints = {}

    if not os.path.isfile(kubeconfig):
        log.warning(
            '%s: kubeconfig not found at %s', __virtualname__, kubeconfig)
        return endpoints

    for service in ['salt-master', 'repositories']:
        endpoints.update({
            service: service_endpoints(service, kubeconfig)
        })

    return {
        'metalk8s': {
            'endpoints': endpoints,
        },
    }
