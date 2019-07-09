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
        return __utils__['pillar_utils.errors_to_dict']([
            'Cannot get `node_name` from {}.'.format(endpoint)
        ])

    try:
        node = __salt__['metalk8s_kubernetes.node'](
            name=node_name,
            kubeconfig=kubeconfig,
        )
    except Exception as exc:  # pylint: disable=broad-except
        error_tplt = 'Unable to get kubernetes node {}:\n{}'
        return __utils__['pillar_utils.errors_to_dict'](
            [error_tplt.format(node_name, exc)]
        )

    node_meta = node['metadata']
    host_net = node_meta['annotations']['projectcalico.org/IPv4Address']
    host_addr = host_net.split('/')[0]

    try:
        service = __salt__['metalk8s_kubernetes.show_service'](
            name=service,
            namespace=namespace,
            kubeconfig=kubeconfig,
        )
    except Exception as exc:  # pylint: disable=broad-except
        error_tplt = 'Unable to get kubernetes service {} in namespace {}:\n{}'
        return __utils__['pillar_utils.errors_to_dict'](
            [error_tplt.format(service, namespace, exc)]
        )

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
            return __utils__['pillar_utils.errors_to_dict']([
                'Endpoint not found: {}'.format(service)
            ])

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
        error_tplt = (
            'Unable to get kubernetes endpoints'
            ' for {} in namespace {}:\n{}'
        )
        return __utils__['pillar_utils.errors_to_dict']([
            error_tplt.format(service, namespace, exc)
        ])
    else:
        return res


def ext_pillar(minion_id, pillar, kubeconfig):
    services = {
        "kube-system": ['salt-master', 'repositories'],
    }
    nodeport_services = {"monitoring": ["prometheus"]}

    if not os.path.isfile(kubeconfig):
        error_tplt = '{}: kubeconfig not found at {}'
        endpoints = __utils__['pillar_utils.errors_to_dict']([
            error_tplt.format(__virtualname__, kubeconfig)
        ])

    else:
        endpoints = {}

        for namespace, services in services.items():
            for service in services:
                endpoints.update(
                    {
                        service: service_endpoints(
                            service, namespace, kubeconfig
                        )
                    }
                )
                __utils__['pillar_utils.promote_errors'](endpoints, service)

        for namespace, services in nodeport_services.items():
            for service in services:
                endpoints.update({
                    service: service_endpoints_nodeport(
                        service, namespace, kubeconfig
                    )
                })
                __utils__['pillar_utils.promote_errors'](endpoints, service)

    result = {
        'metalk8s': {
            'endpoints': endpoints
        }
    }

    __utils__['pillar_utils.promote_errors'](result['metalk8s'], 'endpoints')

    return result
