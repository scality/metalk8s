'''Metalk8s network related utilities.'''

import itertools
import logging

from salt._compat import ipaddress
from salt.exceptions import CommandExecutionError

K8S_CLUSTER_ADDRESS_NUMBER = 0
OIDC_ADDRESS_NUMBER = 6
COREDNS_ADDRESS_NUMBER = 9


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_network'


def __virtual__():
    return __virtualname__


def _pick_nth_service_ip(n):
    '''
    Pick the nth IP address from a network range, based on pillar
    configurations provided in CIDR notation.
    '''
    cidr = __pillar__.get('networks', {}).get('service')
    if cidr is None:
        raise CommandExecutionError(
            'Pillar key "networks:service" must be set.'
        )

    network = ipaddress.IPv4Network(unicode(cidr))
    # NOTE: hosts() method below returns usable hosts in a network.
    # The usable hosts are all the IP addresses that belong to the network,
    # except the network address itself and the network broadcast address.
    ip = next(
        itertools.islice(network.hosts(), n, None),
        None
    )
    if ip is None:
        raise CommandExecutionError(
            'Could not obtain an IP in the network range {}'.format(
                cidr
            )
        )
    return str(ip)


def get_kubernetes_service_ip():
    '''
    Return the Kubernetes service cluster IP.

    This IP is arbitrarily selected as the first IP from the usable hosts
    range.
    Note:
    In kube-apiserver Pod manifest, we define a service-cluster-ip-range which
    sets the kube-api address to the first usable host.
    '''
    return _pick_nth_service_ip(K8S_CLUSTER_ADDRESS_NUMBER)


def get_cluster_dns_ip():
    '''
    Return the CoreDNS cluster IP.

    This IP is arbitrarily selected as the tenth IP from the usable hosts
    range.
    '''
    return _pick_nth_service_ip(COREDNS_ADDRESS_NUMBER)


def get_oidc_service_ip():
    '''
    Return the OIDC service cluster IP.

    This IP is arbitrarily selected as the seventh IP from the usable hosts
    range.
    '''
    return _pick_nth_service_ip(OIDC_ADDRESS_NUMBER)