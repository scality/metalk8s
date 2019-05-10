# -*- coding: utf-8 -*-
'''
Module for handling MetalK8s specific calls.
'''
import logging
import socket
import time

from salt.exceptions import CommandExecutionError
from salt.utils.decorators import depends

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


@depends(KUBERNETES_PRESENT, fallback_function=deps_missing)
def wait_apiserver(retry=10, interval=1, **kwargs):
    """Wait for kube-apiserver to respond.

    Simple "retry" wrapper around the kubernetes.ping Salt execution function.
    """
    status = __salt__['metalk8s_kubernetes.ping'](**kwargs)
    attempts = 1

    while not status and attempts < retry:
        time.sleep(interval)
        status = __salt__['metalk8s_kubernetes.ping'](**kwargs)
        attempts += 1

    if not status:
        log.error('Kubernetes apiserver failed to respond after %d attempts',
                  retry)

    return status


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


def _execute_etcd_command(pod_name, cmd):
    if isinstance(cmd, str):
        cmd = [cmd]
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
    ] + cmd
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


def check_etcd_health(hostname):
    '''Check cluster-health of the `etcd` cluster.

    This module is only runnable from the salt-master on the bootstrap node.

    Arguments:
        hostname (str): hostname of an etcd node
    '''
    pod_name = 'etcd-{}'.format(hostname)
    _execute_etcd_command(pod_name, 'cluster-health')


def format_san(names):
    '''Format a `subjectAlternativeName` section of a certificate.

    Arguments:
        names ([str]): List if SANs, either IP addresses or DNS names
    '''
    def format_name(name):
        # First, try to parse as an IPv4/IPv6 address
        for af_name in ['AF_INET', 'AF_INET6']:
            try:
                af = getattr(socket, af_name)
            except AttributeError:
                log.info('Unkown address family: %s', af_name)
                continue

            try:
                # Parse
                log.debug('Trying to parse %r as %s', name, af_name)
                packed = socket.inet_pton(af, name)
                # Unparse
                log.debug('Trying to unparse %r as %s', packed, af_name)
                unpacked = socket.inet_ntop(af, packed)

                result = 'IP:{}'.format(unpacked)
                log.debug('SAN field for %r is "%s"', name, result)
                return result
            except socket.error as exc:
                log.debug('Failed to parse %r as %s: %s', name, af_name, exc)

        # Fallback to assume it's a DNS name
        result = 'DNS:{}'.format(name)
        log.debug('SAN field for %r is "%s"', name, result)
        return result

    return ', '.join(sorted(format_name(name) for name in names))


def minions_by_role(role, nodes=None):
    '''Return a list of minion IDs in a specific role from Pillar data.

    Arguments:
        role (str): Role to match on
        nodes (dict(str, dict)): Nodes to inspect
            Defaults to `pillar.metalk8s.nodes`.
    '''
    nodes = nodes or __pillar__['metalk8s']['nodes']

    return [
        node
        for (node, node_info) in nodes.items()
        if role in node_info.get('roles', [])
    ]
