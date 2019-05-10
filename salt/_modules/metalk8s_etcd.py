# -*- coding: utf-8 -*-
'''
Module for handling etcd client specific calls.
'''
import logging

from salt.exceptions import CommandExecutionError
from salt.utils.decorators import depends

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
    return __virtualname__


def deps_missing(*args, **kwargs):
    raise CommandExecutionError("python etcd client is not installed")


def _get_endpoint_up(ca_cert, cert_key, cert_cert):
    """Pick an answering etcd endpoint among all etcd servers."""
    etcd_hosts = __salt__['metalk8s.minions_by_role']('etcd')

    # Get host ip from etcd_hosts
    endpoints = [
        __salt__['saltutil.runner'](
            'mine.get',
            tgt=host,
            fun='control_plane_ip'
        )[host]
        for host in etcd_hosts
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


@depends(PYTHON_ETCD_PRESENT, fallback_function=deps_missing)
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
