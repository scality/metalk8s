from __future__ import absolute_import

import logging


log = logging.getLogger(__name__)


def node_drained(name, **kwargs):
    ret = {"name": name, "changes": {}, "result": False, "comment": ""}

    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = f"The node {name} is going to be drained"
        return ret

    res = __salt__["metalk8s_kubernetes.node_drain"](name, **kwargs)

    ret["result"] = True
    ret["comment"] = res

    ret["changes"][name] = {name: "drained"}

    return ret
