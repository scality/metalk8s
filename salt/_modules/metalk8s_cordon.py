"""
Module for cordoning and uncordoning a Kubernetes node.

This module's functions are merged into the `metalk8s_kubernetes`
module when called by salt by virtue of its `__virtualname__` attribute.
"""
from salt.exceptions import CommandExecutionError


__virtualname__ = "metalk8s_kubernetes"


def __virtual__():
    return __virtualname__


def _check_deps():
    """
    Not able to check salt dependencies in execution module directly in
    `__virtual__` function this function check for salt deps and raise
    if not present.
    """
    mod = "metalk8s_kubernetes.update_object"

    if mod not in __salt__:
        raise CommandExecutionError(f"'{mod}' is not available")


def cordon_node(node_name, **kwargs):
    """
    Cordon a node (set unschedulable to True)

    CLI Example:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.cordon_node node_name="bootstrap"
    """
    _check_deps()

    return __salt__["metalk8s_kubernetes.update_object"](
        name=node_name,
        kind="Node",
        apiVersion="v1",
        patch={"spec": {"unschedulable": True}},
        **kwargs,
    )


def uncordon_node(node_name, **kwargs):
    """
    Uncordon a node (set unschedulable to False)

    CLI Example:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.uncordon_node node_name="bootstrap"
    """
    _check_deps()

    patch_dict = {"spec": {"unschedulable": False}}

    # k-c-m 1.12 adds taint `node.kubernetes.io/unschedulable` when cordonning
    # a node but k-c-m 1.11 does not remove this taint when uncordonning so,
    # we need to manually remove it when necessary by patching taints.
    all_node_taints = (
        __salt__["metalk8s_kubernetes.get_object"](
            name=node_name, kind="Node", apiVersion="v1", **kwargs
        )["spec"].get("taints")
        or []
    )

    key_to_remove = "node.kubernetes.io/unschedulable"

    if key_to_remove in (taint["key"] for taint in all_node_taints):
        new_taints = [
            taint for taint in all_node_taints if taint["key"] != key_to_remove
        ]
        patch_dict["spec"]["taints"] = new_taints

    return __salt__["metalk8s_kubernetes.update_object"](
        name=node_name, kind="Node", apiVersion="v1", patch=patch_dict, **kwargs
    )
