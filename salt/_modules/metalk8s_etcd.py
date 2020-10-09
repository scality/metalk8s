# -*- coding: utf-8 -*-
'''
Module for handling etcd client specific calls.
'''
import logging
from six.moves.urllib.parse import urlparse

from salt.exceptions import CommandExecutionError

PYTHON_ETCD_PRESENT = False
try:
    import etcd3
    PYTHON_ETCD_PRESENT = True
except ImportError:
    pass

# Timeout when connection to etcd server
TIMEOUT = 30


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_etcd'


def __virtual__():
    if PYTHON_ETCD_PRESENT:
        return __virtualname__
    else:
        return False, "python-etcd3 not available"


def _get_endpoint_up(ca_cert, cert_key, cert_cert, nodes=None):
    """Pick an answering etcd endpoint among all etcd servers."""
    etcd_hosts = __salt__['metalk8s.minions_by_role']('etcd', nodes=nodes)

    # Get host ip from etcd_hosts
    cp_ips = __salt__['saltutil.runner'](
        'mine.get',
        tgt='*',
        fun='control_plane_ip'
    )
    endpoints = [
        cp_ips[host]
        for host in etcd_hosts
        if host in cp_ips
    ]

    for endpoint in endpoints:
        try:
            with etcd3.client(host=endpoint,
                              ca_cert=ca_cert,
                              cert_key=cert_key,
                              cert_cert=cert_cert,
                              timeout=TIMEOUT) as etcd:
                etcd.status()
        except etcd3.exceptions.ConnectionFailedError:
            pass
        else:
            return endpoint

    raise Exception('Unable to find an available etcd member in the cluster')


def add_etcd_node(
        peer_urls,
        endpoint=None,
        ca_cert='/etc/kubernetes/pki/etcd/ca.crt',
        cert_key='/etc/kubernetes/pki/etcd/salt-master-etcd-client.key',
        cert_cert='/etc/kubernetes/pki/etcd/salt-master-etcd-client.crt'):
    '''Add a new `etcd` node into the `etcd` cluster.

    This module is only runnable from the salt-master on the bootstrap node.

    Arguments:
        host (str): hostname of the new etcd node
        endpoint (str): host server in the etcd cluster
                        IP is expected, not URL
    '''
    if not endpoint:
        # If we have no endpoint get it from mine
        endpoint = _get_endpoint_up(
            ca_cert=ca_cert,
            cert_key=cert_key,
            cert_cert=cert_cert
        )

    with etcd3.client(host=endpoint,
                      ca_cert=ca_cert,
                      cert_key=cert_key,
                      cert_cert=cert_cert,
                      timeout=TIMEOUT) as etcd:
        node = etcd.add_member(peer_urls)

    return node


def urls_exist_in_cluster(
        peer_urls,
        endpoint=None,
        ca_cert='/etc/kubernetes/pki/etcd/ca.crt',
        cert_key='/etc/kubernetes/pki/etcd/salt-master-etcd-client.key',
        cert_cert='/etc/kubernetes/pki/etcd/salt-master-etcd-client.crt'):
    '''Verify if peer_urls exists in cluster.'''
    if not endpoint:
        # If we have no endpoint get it from mine
        endpoint = _get_endpoint_up(
            ca_cert=ca_cert,
            cert_key=cert_key,
            cert_cert=cert_cert
        )

    with etcd3.client(host=endpoint,
                      ca_cert=ca_cert,
                      cert_key=cert_key,
                      cert_cert=cert_cert,
                      timeout=TIMEOUT) as etcd:
        all_urls = []
        for member in etcd.members:
            all_urls.extend(member.peer_urls)

    return set(peer_urls).issubset(all_urls)


def check_etcd_health(
        minion_id=None,
        ca_cert='/etc/kubernetes/pki/etcd/ca.crt',
        cert_key='/etc/kubernetes/pki/etcd/salt-master-etcd-client.key',
        cert_cert='/etc/kubernetes/pki/etcd/salt-master-etcd-client.crt'):
    '''Check cluster-health of the `etcd` cluster.

    This module is only runnable from the salt-master on the bootstrap node.

    Arguments:
        minion_id (str): minion id of an etcd node
    '''
    # Get host ip from the minion id
    if minion_id:
        endpoint = __salt__['saltutil.runner'](
            'mine.get', tgt=minion_id, fun='control_plane_ip'
        )[minion_id]
    else:
        endpoint = _get_endpoint_up(
            ca_cert=ca_cert,
            cert_key=cert_key,
            cert_cert=cert_cert
        )
    # Get all members
    with etcd3.client(host=endpoint,
                      ca_cert=ca_cert,
                      cert_key=cert_key,
                      cert_cert=cert_cert,
                      timeout=TIMEOUT) as etcd:
        etcd_members = list(etcd.members)

    unhealthy_member = 0
    for member in etcd_members:
        etcd_url = urlparse(member.client_urls[0])
        try:
            with etcd3.client(host=etcd_url.hostname,
                              port=etcd_url.port,
                              ca_cert=ca_cert,
                              cert_key=cert_key,
                              cert_cert=cert_cert,
                              timeout=TIMEOUT) as etcd:
                etcd.status()
        except Exception:  # pylint: disable=broad-except
            log.debug(
                "failed to check the health of member %s", member.name
            )
            unhealthy_member += 1

    # Raise on error as this function will be called by module.run in sls file
    if unhealthy_member == len(etcd_members):
        raise CommandExecutionError("cluster is unavailable")
    elif unhealthy_member > 0:
        raise CommandExecutionError("cluster is degraded")
    else:
        return "cluster is healthy"


def get_etcd_member_list(
        endpoint=None,
        nodes=None,
        ca_cert='/etc/kubernetes/pki/etcd/ca.crt',
        cert_key='/etc/kubernetes/pki/etcd/salt-master-etcd-client.key',
        cert_cert='/etc/kubernetes/pki/etcd/salt-master-etcd-client.crt'):
    '''Get the list of etcd members using the python etcd3 client.'''
    if not endpoint:
        # If we have no endpoint get it from mine
        try:
            endpoint = _get_endpoint_up(
                nodes=nodes,
                ca_cert=ca_cert,
                cert_key=cert_key,
                cert_cert=cert_cert
            )
        except:
            return []

    with etcd3.client(host=endpoint,
                      ca_cert=ca_cert,
                      cert_key=cert_key,
                      cert_cert=cert_cert,
                      timeout=TIMEOUT) as etcd:
        return [
            {
                'id': member.id,
                'name': member.name,
                'peer_urls': list(member.peer_urls),
                'client_urls': list(member.client_urls)
            } for member in etcd.members
        ]
