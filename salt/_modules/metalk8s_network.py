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

    network = ipaddress.IPv4Network(cidr)
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


def get_ip_from_cidrs(cidrs, current_ip=None):
    '''
    Return the first IP available

    A current_ip can be given so that if the current_ip is already part of
    one cidr we keep this IP (otherwise we return the first one)
    '''
    first_ip = None

    for cidr in cidrs:
        ip_addrs = __salt__["network.ip_addrs"](cidr=cidr)
        if current_ip and current_ip in ip_addrs:
            # Current IP still valid, return it
            return current_ip

        if ip_addrs and first_ip is None:
            first_ip = ip_addrs[0]

    if not first_ip:
        raise CommandExecutionError(
            "Unable to find an IP on this host in one of this cidr: {}"
            .format(', '.join(cidrs))
        )

    return first_ip


def get_mtu_from_ip(ip):
    '''
    Return the MTU of the first interface with the specified IP
    '''
    ifaces = __salt__['network.ifacestartswith'](ip)

    if not ifaces:
        raise CommandExecutionError(
            'Unable to get interface for "{}"'.format(ip)
        )

    iface = ifaces[0]

    if len(ifaces) > 1:
        log.warning(
            'Several interfaces match the IP "%s", %s will be used: %s',
            ip,
            iface, ', '.join(ifaces)
        )

    return int(__salt__['file.read']('/sys/class/net/{}/mtu'.format(iface)))
