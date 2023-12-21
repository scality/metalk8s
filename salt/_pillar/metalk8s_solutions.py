import logging
from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_solutions"


def __virtual__():
    if "metalk8s_solutions.read_config" not in __salt__:
        return False, "Failed to load 'metalk8s_solution' module."
    return __virtualname__


def _load_solutions(bootstrap_id):
    """Load Solutions from ConfigMap and config file."""
    result = {
        "available": {},
        "config": {},
        "environments": {},
    }

    try:
        result["config"] = __salt__["metalk8s_solutions.read_config"]()
    except (IOError, CommandExecutionError) as exc:
        result["config"] = __utils__["pillar_utils.errors_to_dict"](
            [f"Error when reading Solutions config file: {exc}"]
        )

    errors = []
    try:
        available_ret = __salt__["saltutil.cmd"](
            tgt=bootstrap_id,
            fun="metalk8s_solutions.list_available",
        )[bootstrap_id]
        if available_ret["retcode"] != 0:
            raise Exception(f"[{available_ret['retcode']}] {available_ret['ret']}")

        result["available"] = available_ret["ret"]
    except Exception as exc:  # pylint: disable=broad-except
        errors.append(f"Error when listing available Solutions: {exc}")

    try:
        active = __salt__["metalk8s_solutions.list_active"]()
    except Exception as exc:  # pylint: disable=broad-except
        errors.append(f"Error when listing active Solution versions: {exc}")

    if errors:
        result["available"].update(__utils__["pillar_utils.errors_to_dict"](errors))
    else:
        # Set `active` flag on active Solution versions
        for solution, versions in result["available"].items():
            active_version = active.get(solution)
            for version_info in versions:
                version_info["active"] = version_info["version"] == active_version

    try:
        result["environments"] = __salt__["metalk8s_solutions.list_environments"]()
    except Exception as exc:  # pylint: disable=broad-except
        result["environments"] = __utils__["pillar_utils.errors_to_dict"](
            [f"Error when listing Solution Environments: {exc}"]
        )

    for key in ["available", "config", "environments"]:
        __utils__["pillar_utils.promote_errors"](result, key)

    return result


def ext_pillar(minion_id, pillar):  # pylint: disable=unused-argument
    # NOTE: this ext_pillar relies on the `metalk8s_nodes` ext_pillar to find
    # the Bootstrap minion ID, for the remote execution of
    # `metalk8s_solutions.list_available`.
    errors = []
    pillar_nodes = pillar.get("metalk8s", {}).get("nodes", {})
    if "_errors" in pillar_nodes:
        errors.append("Pillar 'metalk8s:nodes' has errors")
    else:
        bootstrap_nodes = [
            node_name
            for node_name, node_info in pillar_nodes.items()
            if "bootstrap" in node_info["roles"]
        ]
        try:
            (bootstrap_id,) = bootstrap_nodes
        except ValueError:
            errors.append(
                f"Must have one and only one bootstrap Node (found {len(bootstrap_nodes)})"
            )

    if errors:
        error_dict = __utils__["pillar_utils.errors_to_dict"](errors)
        return {"metalk8s": {"solutions": error_dict}}

    return {"metalk8s": {"solutions": _load_solutions(bootstrap_id)}}
