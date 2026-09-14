"""
States to manage the local container image cache.
"""

import logging

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_image_cache"


def __virtual__():
    if "metalk8s_image_cache.provision" not in __salt__:
        return (False, "Missing 'metalk8s_image_cache' module")

    return __virtualname__


def provisioned(name, source):
    """
    Extract the image archives a boot cache image carries into the cache.

    The archives land flat in the cache directory, which is what
    :program:`containerd-image-preload` imports from.

    name
        Path of the cache directory
    source
        Path of the boot cache image, as a docker archive
    """
    ret = {"name": name, "result": False, "changes": {}, "comment": ""}

    try:
        result = __salt__["metalk8s_image_cache.provision"](
            source, name, dry_run=__opts__["test"]
        )
    except CommandExecutionError as exc:
        # The comment reaches the state output, the log reaches the minion
        # log, which is where a failed bootstrap gets read from.
        log.error('Failed to provision "%s" from "%s": %s', name, source, exc)
        ret["comment"] = str(exc)
        return ret

    if not result["extracted"]:
        ret["result"] = True
        ret["comment"] = f"All {len(result['present'])} archives already in the cache"
        return ret

    ret["changes"] = {"extracted": result["extracted"]}

    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = f"Would extract {len(result['extracted'])} archives"
        return ret

    ret["result"] = True
    ret["comment"] = f"Extracted {len(result['extracted'])} archives"

    return ret
