from __future__ import absolute_import


def _node_set_unschedulable(name, value, **kwargs):
    ret = {"name": name, "changes": {}, "result": False, "comment": ""}

    action = "cordon" if value else "uncordon"

    unschedulable = (
        __salt__["metalk8s_kubernetes.get_object"](
            name=name, kind="Node", apiVersion="v1", **kwargs
        )["spec"].get("unschedulable")
        or False
    )

    if unschedulable == value:
        ret["result"] = True
        ret["comment"] = f"The node {name} is already {action}ed"
        return ret

    if __opts__["test"]:
        ret["comment"] = f"The node {name} is going to be {action}ed"
        ret["result"] = None
        return ret

    res = __salt__[f"metalk8s_kubernetes.{action}_node"](node_name=name, **kwargs)

    ret["result"] = True
    ret["changes"] = {
        "old": {"unschedulable": unschedulable},
        "new": {"unschedulable": res["spec"].get("unschedulable")},
    }
    ret["comment"] = f"Node {name} {action}ed"

    return ret


def node_cordoned(name, **kwargs):
    """
    Ensures that the named node is cordoned.

    name
        the name of the node
    """
    return _node_set_unschedulable(name, True, **kwargs)


def node_uncordoned(name, **kwargs):
    """
    Ensures that the named node is uncordoned.

    name
        the name of the node
    """
    return _node_set_unschedulable(name, False, **kwargs)
