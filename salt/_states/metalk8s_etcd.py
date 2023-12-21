# -*- coding: utf-8 -*-
import logging

log = logging.getLogger(__name__)


__virtualname__ = "metalk8s_etcd"


def __virtual__():
    if "metalk8s_etcd.add_etcd_node" not in __salt__:
        return False, "`metalk8s_etcd.add_etcd_node` not available"
    else:
        return __virtualname__


def member_present(name, peer_urls):
    """Ensure that the etcd node is in cluster

    Arguements:
        peer_urls ([str]): List of the etcd peer urls to add
    """
    ret = {"name": name, "changes": {}, "result": False, "comment": ""}

    # Check that peer urls does not exist
    if __salt__["metalk8s_etcd.urls_exist_in_cluster"](peer_urls):
        ret["result"] = True
        ret["comment"] = f"Peer URLs: {', '.join(peer_urls)} already exists"
        return ret

    # Add node
    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = "Node would be added to the cluster"
        ret["change"] = {"peer_urls": str(", ".join(peer_urls))}
        return ret

    try:
        member = __salt__["metalk8s_etcd.add_etcd_node"](peer_urls)
    except Exception as exc:  # pylint: disable=broad-except
        ret["comment"] = f"Failed to add {name} in the cluster: {exc}"
    else:
        ret["result"] = True
        ret["changes"] = {
            "id": member.id,
            "name": member.name,
            "peer_urls": str(", ".join(member.peer_urls)),
            "client_urls": str(", ".join(member.client_urls)),
        }
        ret["comment"] = "Node added in etcd cluster"

    return ret
