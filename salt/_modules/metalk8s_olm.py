"""Interacts with some OLM CRDs"""


__virtualname__ = "metalk8s_olm"


def __virtual__():
    return __virtualname__

def check_csv_ready(name:str, namespace:str = "olm"):
    csv = __salt__["metalk8s_kubernetes.get_object"](
        kind="ClusterServiceVersion",
        apiVersion="operators.coreos.com/v1alpha1",
        name=name,
        namespace=namespace
    )
    return csv["status"].get("phase", "") == "Succeeded"
