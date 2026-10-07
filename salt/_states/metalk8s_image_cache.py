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


def pulled(name, image, marker, hosts_dir=None):
    """
    Extract the image archives a boot cache image carries, from the registry.

    The hot path of :py:func:`provisioned`, for a node joining a cluster that
    already runs: it has no ISO mounted, so the image comes from the registry.

    name
        Path of the cache directory
    image
        Reference of the boot cache image in the registry
    marker
        Path of the JSON file recording what was extracted: the image
        reference, the layer digest and the archive names
    hosts_dir : None
        Directory holding the registry host configuration
    """
    ret = {"name": name, "result": False, "changes": {}, "comment": ""}

    try:
        result = __salt__["metalk8s_image_cache.provision_from_image"](
            image,
            name,
            marker,
            hosts_dir=hosts_dir,
            dry_run=__opts__["test"],
        )
    except CommandExecutionError as exc:
        # The comment reaches the state output, the log reaches the minion
        # log, which is where a failed deployment gets read from.
        log.error('Failed to provision "%s" from "%s": %s', name, image, exc)
        ret["comment"] = str(exc)
        # Publishing several archives is a loop and not one atomic act, so a
        # failure part way through leaves the cache holding a prefix that the
        # preload timer imports anyway. Reporting no change at all would send
        # the operator looking somewhere the trouble is not.
        published = getattr(exc, "published", None)
        if published:
            ret["changes"] = {"extracted": published}
        return ret

    # `None` and `[]` both mean nothing was written, for opposite reasons: a
    # dry run that would extract but cannot name what, against a cache already
    # holding this digest. Testing truthiness would merge the two.
    if result["extracted"] is None:
        ret["changes"] = {"image": image}
        ret["result"] = None
        ret["comment"] = f"Would fill the cache from {image}"
        return ret

    if not result["extracted"]:
        ret["result"] = True
        ret["comment"] = f"Cache already holds the archives of {result['digest']}"
        return ret

    ret["changes"] = {"extracted": result["extracted"]}
    ret["result"] = True
    ret["comment"] = f"Extracted {len(result['extracted'])} archives"

    return ret
