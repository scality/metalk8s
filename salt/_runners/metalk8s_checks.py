# -*- coding: utf-8 -*-
"""
Runner module handling MetalK8s cluster checks.
"""

from salt.exceptions import CheckError

__virtualname__ = "metalk8s_checks"


def __virtual__():
    return __virtualname__


def _handle_errors(errors, raises):
    """Simple helper to handle whether we should raise or not"""
    if not errors:
        return True

    if raises:
        raise CheckError("\n".join(errors))

    # Due to a bug in Salt run CLI, if a runner module raises the exit code
    # of the command is still 0.
    # In order to have an other exit code, today, we need to return a dict
    # with `retcode` key
    # See https://github.com/saltstack/salt/issues/61173
    return {"retcode": 1, "errors": errors}


def nodes(node_list=None, raises=True):
    """Check that all nodes are Ready

    Args:
        node_list (list, optional): List of node to check. Defaults to `pillar.metalk8s.nodes`.
        raises (bool, optional): Whether or not this function should raise. Defaults to True.

    Raises:
        CheckError: If 'raises' is True and some nodes are not ready

    Returns:
        dict or True: An error message or True if everything OK
    """
    errors = []

    if node_list is None:
        node_list = __pillar__["metalk8s"]["nodes"].keys()

    not_ready_nodes = {}
    for node_name in node_list:
        node_obj = __salt__["salt.cmd"](
            fun="metalk8s_kubernetes.get_object",
            kind="Node",
            apiVersion="v1",
            name=node_name,
        )

        condition = next(
            cond for cond in node_obj["status"]["conditions"] if cond["type"] == "Ready"
        )
        if condition["status"] != "True":
            not_ready_nodes.setdefault(condition["reason"], []).append(node_name)

    for reason, nodes_names in not_ready_nodes.items():
        errors.append(
            "Nodes '{}' are not ready - {}".format("', '".join(nodes_names), reason)
        )

    return _handle_errors(errors, raises)


def minions(minion_list=None, raises=True):
    """Check that all Salt minions are Ready

    Args:
        minion_list (list, optional): List of Salt minion to check. Defaults to `pillar.metalk8s.nodes`.
        raises (bool, optional): Whether or not this function should raise. Defaults to True.

    Raises:
        CheckError: If 'raises' is True and some Salt minions are not ready

    Returns:
        dict or True: An error message or True if everything OK
    """
    errors = []

    if minion_list is None:
        minion_list = __pillar__["metalk8s"]["nodes"].keys()

    ret = __salt__["salt.execute"](
        ",".join(minion_list), "test.ping", tgt_type="list", timeout=10
    )

    not_ready_minions = {
        "are not ready": [
            minion for minion, minion_ret in ret.items() if minion_ret is not True
        ],
        "did not answered": list(set(minion_list) - set(ret.keys())),
    }

    for reason, minions_names in not_ready_minions.items():
        if minions_names:
            errors.append(
                "Salt minions '{}' {}".format("', '".join(minions_names), reason)
            )

    return _handle_errors(errors, raises)


def upgrade(dest_version, saltenv, raises=True):
    """Check that we can start MetalK8s cluster upgrade

    Args:
        dest_version (string): Destination version for upgrade
        saltenv (string): Salt environment that will be used for upgrade
        raises (bool, optional): Whether or not this function should raise. Defaults to True.

    Raises:
        CheckError: If 'raises' is True and some upgrade conditions are not met

    Returns:
        dict or True: An error message or True if everything OK
    """
    errors = []

    # NOTE: We use `get_from_map` as we want also defaults from `map.jinja`
    # to be merged
    metalk8s_pillar = __salt__["salt.cmd"](
        "metalk8s.get_from_map", "metalk8s", saltenv=saltenv, with_pillar=True
    )

    # When upgrading the saltenv should be the "metalk8s-<destination version>"
    if saltenv != f"metalk8s-{dest_version}":
        errors.append(
            f"Invalid saltenv '{saltenv}' consider using 'metalk8s-{dest_version}'"
        )

    # Check that all nodes are in a supported upgrade path
    # We only support upgrade from one minor version
    dest = dest_version.split(".")
    min_version = f"{dest[0]}.{int(dest[1]) - 1}.0"

    for node_name, node_info in metalk8s_pillar["nodes"].items():
        if (
            __salt__["salt.cmd"]("pkg.version_cmp", min_version, node_info["version"])
            == 1
        ):
            errors.append(
                "Unable to upgrade from more than 1 minor version, Node "
                f"{node_name} is in {node_info['version']} and you try to upgrade "
                f"to {dest_version}"
            )

    nodes_ready = nodes(node_list=metalk8s_pillar["nodes"].keys(), raises=False)
    if nodes_ready is not True:
        errors.extend(nodes_ready["errors"])

    minions_ready = minions(minion_list=metalk8s_pillar["nodes"].keys(), raises=False)
    if minions_ready is not True:
        errors.extend(minions_ready["errors"])

    return _handle_errors(errors, raises)
