"""Metalk8s network related utilities."""

import itertools
import logging

# Note: psutil is a dependency of Salt RPMs in MetalK8s context we
#       always use RPMs to install Salt
import psutil  # pylint: disable=3rd-party-module-not-gated

from salt._compat import ipaddress
from salt.exceptions import CommandExecutionError

K8S_CLUSTER_ADDRESS_NUMBER = 0
OIDC_ADDRESS_NUMBER = 6
COREDNS_ADDRESS_NUMBER = 9


log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_network"


def __virtual__():
    return __virtualname__


def _pick_nth_service_ip(n):
    """
    Pick the nth IP address from a network range, based on pillar
    configurations provided in CIDR notation.
    """
    cidr = __pillar__.get("networks", {}).get("service")
    if cidr is None:
        raise CommandExecutionError('Pillar key "networks:service" must be set.')

    network = ipaddress.IPv4Network(cidr)
    # NOTE: hosts() method below returns usable hosts in a network.
    # The usable hosts are all the IP addresses that belong to the network,
    # except the network address itself and the network broadcast address.
    ip = next(itertools.islice(network.hosts(), n, None), None)
    if ip is None:
        raise CommandExecutionError(
            "Could not obtain an IP in the network range {}".format(cidr)
        )
    return str(ip)


def get_kubernetes_service_ip():
    """
    Return the Kubernetes service cluster IP.

    This IP is arbitrarily selected as the first IP from the usable hosts
    range.
    Note:
    In kube-apiserver Pod manifest, we define a service-cluster-ip-range which
    sets the kube-api address to the first usable host.
    """
    return _pick_nth_service_ip(K8S_CLUSTER_ADDRESS_NUMBER)


def get_cluster_dns_ip():
    """
    Return the CoreDNS cluster IP.

    This IP is arbitrarily selected as the tenth IP from the usable hosts
    range.
    """
    return _pick_nth_service_ip(COREDNS_ADDRESS_NUMBER)


def get_oidc_service_ip():
    """
    Return the OIDC service cluster IP.

    This IP is arbitrarily selected as the seventh IP from the usable hosts
    range.
    """
    return _pick_nth_service_ip(OIDC_ADDRESS_NUMBER)


def get_ip_from_cidrs(cidrs, current_ip=None):
    """
    Return the first IP available

    A current_ip can be given so that if the current_ip is already part of
    one cidr we keep this IP (otherwise we return the first one)
    """
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
            "Unable to find an IP on this host in one of this cidr: {}".format(
                ", ".join(cidrs)
            )
        )

    return first_ip


def get_mtu_from_ip(ip):
    """
    Return the MTU of the first interface with the specified IP
    """
    ifaces = __salt__["network.ifacestartswith"](ip)

    if not ifaces:
        raise CommandExecutionError('Unable to get interface for "{}"'.format(ip))

    iface = ifaces[0]

    if len(ifaces) > 1:
        log.warning(
            'Several interfaces match the IP "%s", %s will be used: %s',
            ip,
            iface,
            ", ".join(ifaces),
        )

    return int(__salt__["file.read"]("/sys/class/net/{}/mtu".format(iface)))


def get_listening_processes():
    """
    Get all the listening processes on the local node

    Output:
    ```
    {
        '<port>': {
            '<ip>': {
                'pid': <pid>,
                'name': '<process_name>'
            }
        }
    }
    ```
    """
    all_listen_connections = {}
    for sconn in psutil.net_connections("inet"):
        if sconn.status != psutil.CONN_LISTEN:
            continue

        ip, port = sconn.laddr
        # If `<ip>` is `::1` replace with `127.0.0.1` so that we consider only IPv4
        if ip == "::1":
            ip = "127.0.0.1"
        # If `<ip>` is `::` replace with `0.0.0.0` so that we consider only IPv4
        elif ip == "::":
            ip = "0.0.0.0"

        all_listen_connections.setdefault(str(port), {}).update(
            {
                ip: {
                    "pid": sconn.pid,
                    "name": psutil.Process(sconn.pid).name(),
                }
            }
        )

    return all_listen_connections


def routes():
    """
    Return currently configured IPv4 routes from routing table

    CLI Example:

    .. code-block:: bash

        salt '*' metalk8s_network.routes
    """
    ret = []
    cmd = "ip -4 route show table main"
    out = __salt__["cmd.run"](cmd)
    for line in out.splitlines():
        comps = line.split()

        if comps[0] in ("unreachable", "blackhole"):
            continue

        if comps[0] == "default":
            ip_interface = ""
            if comps[3] == "dev":
                ip_interface = comps[4]

            ret.append(
                {
                    "addr_family": "inet",
                    "destination": "0.0.0.0",
                    "gateway": comps[2],
                    "netmask": "0.0.0.0",
                    "flags": "UG",
                    "interface": ip_interface,
                }
            )
        else:
            try:
                address_mask = __salt__["network.convert_cidr"](comps[0])
            except ValueError:
                log.warning("Unsupported route type or format: %s", line)
                continue

            ip_interface = ""
            if comps[1] == "dev":
                ip_interface = comps[2]

            ret.append(
                {
                    "addr_family": "inet",
                    "destination": address_mask["network"],
                    "gateway": "0.0.0.0",
                    "netmask": address_mask["netmask"],
                    "flags": "U",
                    "interface": ip_interface,
                }
            )

    return ret


def get_control_plane_ingress_ip():
    if __pillar__["networks"]["control_plane"].get("ingress", {}).get("ip"):
        return __pillar__["networks"]["control_plane"]["ingress"]["ip"]

    # Use Bootstrap Control Plane IP as Ingress Control plane IP
    bootstrap_id = __salt__["metalk8s.minions_by_role"]("bootstrap")[0]

    if __grains__["id"] == bootstrap_id:
        return __grains__["metalk8s"]["control_plane_ip"]

    if __opts__.get("__role") == "minion":
        mine_ret = __salt__["mine.get"](tgt=bootstrap_id, fun="control_plane_ip")
    else:
        mine_ret = __salt__["saltutil.runner"](
            "mine.get", tgt=bootstrap_id, fun="control_plane_ip"
        )

    if not isinstance(mine_ret, dict) or bootstrap_id not in mine_ret:
        raise CommandExecutionError(
            "Unable to get {} Control Plane IP: {}".format(bootstrap_id, mine_ret)
        )

    return mine_ret[bootstrap_id]


def get_control_plane_ingress_endpoint():
    return "https://{}:8443".format(
        __salt__["metalk8s_network.get_control_plane_ingress_ip"]()
    )


def get_control_plane_ingress_external_ips():
    """Get all Control Plane Ingress external IPs

    NOTE: Only the first one will be used as redirect IP for oidc
    """
    master_nodes = __salt__["metalk8s.minions_by_role"]("master")

    # This function only run on master
    mine_ret = __salt__["saltutil.runner"](
        "mine.get", tgt=",".join(master_nodes), tgt_type="list", fun="control_plane_ip"
    )

    if not isinstance(mine_ret, dict):
        raise CommandExecutionError(
            f"Unable to get master Control Plane IPs: {mine_ret}"
        )

    return [__salt__["metalk8s_network.get_control_plane_ingress_ip"]()] + sorted(
        list(mine_ret.values())
    )
