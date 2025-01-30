"""Interacts with OLMv1 CRs"""

__virtualname__ = "metalk8s_olm"


def __virtual__():
    return __virtualname__


def check_condition_status(kind: str, name: str, condition: str, status: str):
    obj = __salt__["metalk8s_kubernetes.get_object"](
        kind=kind, apiVersion="olm.operatorframework.io/v1", name=name
    )
    for cond in obj["status"]["conditions"]:
        if cond["type"] == condition:
            return cond["status"] == status
    return False


def check_clustercatalog_serving(name: str):
    return check_condition_status("ClusterCatalog", name, "Serving", "True")
