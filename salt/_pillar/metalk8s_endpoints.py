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


def service_endpoints_nodeport(service, namespace, kubeconfig):
    endpoint = service_endpoints(service, namespace, kubeconfig)
    node_name = endpoint.get('node_name')

    if not node_name:
        log.error('Cannot get `node_name` from %s.', endpoint)
        return {}

    try:
        node = __salt__['metalk8s_kubernetes.node'](
            name=node_name,
            kubeconfig=kubeconfig,
        )
    except Exception as exc:  # pylint: disable=broad-except
        log.exception('Unable to get kubernetes node %s:\n%s', node_name, exc)
        return {}

    node_meta = node['metadata']
    host_net = node_meta['annotations']['projectcalico.org/IPv4Address']
    host_addr = host_net.split('/')[0]

    try:
        service =  __salt__['metalk8s_kubernetes.show_service'](
            name=service,
            namespace=namespace,
            kubeconfig=kubeconfig,
        )
    except Exception as exc:  # pylint: disable=broad-except
        log.exception(
            'Unable to get kubernetes service %s in namespace %s:\n%s',
            service, namespace, exc)
        return {}

    endpoint['ip'] = host_addr
    endpoint['ports'] = {
        port['name']: port
        for port in service['spec']['ports']
    }

    return endpoint


def service_endpoints(service, namespace, kubeconfig):
    try:
        endpoint = __salt__['metalk8s_kubernetes.show_endpoint'](
            name=service,
            namespace=namespace,
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
            'Unable to get kubernetes endpoints for %s in namespace %s:\n%s',
            service, namespace, exc
        )
        return {}
    else:
        return res


def ext_pillar(minion_id, pillar, kubeconfig):
    endpoints = {}

    services = {
        "kube-system": ['salt-master', 'repositories'],
        "monitoring": ["prometheus"]
    }

    if not os.path.isfile(kubeconfig):
        log.warning(
            '%s: kubeconfig not found at %s', __virtualname__, kubeconfig)
        return endpoints

    for namespace, services in services.items():
        endpoints.update({
            service: service_endpoints(
                service, namespace, kubeconfig
            )
            for service in services
        })

    return {
        'metalk8s': {
            'endpoints': endpoints,
        },
    }
