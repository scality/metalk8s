# coding: utf-8
"""State module to deal with MetalK8s Volume."""

import logging

log = logging.getLogger(__name__)


__virtualname__ = "metalk8s_volumes"


def __virtual__():
    return __virtualname__


def present(name):
    """Ensure that the backing storage exists for the specified volume.

    Args:
        name (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {"name": name, "changes": {}, "result": False, "comment": ""}
    # Idempotence.
    if __salt__["metalk8s_volumes.exists"](name):
        ret["result"] = True
        ret["comment"] = f"Storage for volume {name} already exists."
        return ret
    # Dry-run.
    if __opts__["test"]:
        ret["changes"][name] = "Present"
        ret["result"] = None
        ret["comment"] = f"Storage for volume {name} is going to be created."
        return ret
    # Let's go for real.
    try:
        __salt__["metalk8s_volumes.create"](name)
    except Exception as exn:  # pylint: disable=broad-except
        ret["result"] = False
        ret["comment"] = f"Cannot create storage for volume {name}: {exn}."
    else:
        ret["changes"][name] = "Present"
        ret["result"] = True
        ret["comment"] = f"Storage for volume {name} created."
    return ret


def prepared(name):
    """Prepare the given volume.

    Args:
        name (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {"name": name, "changes": {}, "result": False, "comment": ""}
    # Idempotence.
    if __salt__["metalk8s_volumes.is_prepared"](name):
        ret["result"] = True
        ret["comment"] = f"Volume {name} already prepared."
        return ret
    # Dry-run.
    if __opts__["test"]:
        ret["changes"][name] = "Prepared"
        ret["result"] = None
        ret["comment"] = f"Volume {name} is going to be prepared."
        return ret
    # Let's go for real.
    try:
        __salt__["metalk8s_volumes.prepare"](name)
    except Exception as exn:  # pylint: disable=broad-except
        ret["result"] = False
        ret["comment"] = f"Failed to prepare volume {name}: {exn}."
    else:
        ret["changes"][name] = "Prepared"
        ret["result"] = True
        ret["comment"] = f"Volume {name} prepared."
    return ret


def removed(name):
    """Remove and cleanup the given volume.

    Args:
        name (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {"name": name, "changes": {}, "result": False, "comment": ""}
    # Idempotence.
    if __salt__["metalk8s_volumes.is_cleaned_up"](name):
        ret["result"] = True
        ret["comment"] = f"Volume {name} already cleaned up."
        return ret
    # Dry-run.
    if __opts__["test"]:
        ret["changes"][name] = "Cleaned up"
        ret["result"] = None
        ret["comment"] = f"Volume {name} is going to be cleaned up."
        return ret
    # Let's go for real.
    try:
        __salt__["metalk8s_volumes.clean_up"](name)
    except Exception as exn:  # pylint: disable=broad-except
        ret["result"] = False
        ret["comment"] = f"Failed to clean up volume {name}: {exn}."
    else:
        ret["changes"][name] = "Cleaned up"
        ret["result"] = True
        ret["comment"] = f"Volume {name} cleaned up."
    return ret
