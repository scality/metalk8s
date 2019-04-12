# -*- coding: utf-8 -*-
'''
Module for handling MetalK8s specific calls.
'''
import logging

from salt.exceptions import CommandExecutionError
from salt.utils.decorators import depends
from salt.exceptions import CommandExecutionError

KUBERNETES_PRESENT = False
try:
    import kubernetes.client
    import kubernetes.config
    from kubernetes.client.rest import ApiException
    from kubernetes.stream import stream as k8s_stream
    KUBERNETES_PRESENT = True
except ImportError:
    pass


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s'


def __virtual__():
    return __virtualname__


def deps_missing(*args, **kwargs):
    raise CommandExecutionError("Kubernetes python client is not installed")


def get_etcd_endpoint():
    '''Get endpoint only if it's an etcd node.'''
    DEFAULT_ETCD_PORT = 2380
    cidr = __pillar__.get('networks', {}).get('control_plane')
    if not cidr:
        return
    if __salt__['cri.component_is_running'](name='etcd'):
        ips = __salt__['network.ip_addrs'](cidr=cidr)
        hostname = __salt__['network.get_hostname']()
        return '{host}=https://{ip}:{port}'.format(
            host=hostname, ip=ips[0], port=DEFAULT_ETCD_PORT
        )


@depends('KUBERNETES_PRESENT', fallback_function=deps_missing)
def add_etcd_node(host, endpoint):
    '''Add a new `etcd` node into the `etcd` cluster.

    This module is only runnable from the salt-master on the bootstrap node.

    Arguments:
        host (str): hostname of the new etcd node
        endpoint (str): endpoint of the new etcd node
    '''
    pod_name = 'etcd-{}'.format(__salt__['network.get_hostname']())
    try:
        client = kubernetes.config.new_client_from_config(
            config_file='/etc/kubernetes/admin.conf'
        )
    except:
        log.exception('failed to load kubeconfig')
        raise
    api = kubernetes.client.CoreV1Api(api_client=client)
    etcd_command = [
        'etcdctl',
        '--endpoints', 'https://localhost:2379',
        '--ca-file', '/etc/kubernetes/pki/etcd/ca.crt',
        '--key-file', '/etc/kubernetes/pki/etcd/server.key',
        '--cert-file', '/etc/kubernetes/pki/etcd/server.crt',
        'member', 'add', host, endpoint
    ]
    try:
        err = k8s_stream(
            api.connect_get_namespaced_pod_exec,
            name=pod_name, namespace='kube-system',
            command=etcd_command,
            stderr=True, stdin=False, stdout=False, tty=False
        )
        if err:
            log.error('etcdctl error: %s', err)
            raise CommandExecutionError('etcdctl: {}'.format(err))
    except ApiException as exn:
        log.exception('failed to run etcdctl')
        raise exn
