"""
States to fill the local container image cache with `imagecachectl`.

`imagecachectl` comes from the image-cache project. It writes the archives a
boot cache image carries under `<cache-path>/<name>/`, next to a sentinel, and
does nothing when that sentinel is already there.
"""

import logging

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_image_cache"

# What `imagecachectl import` prints when the cache already holds the resource.
_ALREADY_HELD = "already holds"


def __virtual__():
    # No check on the binary here: it may be installed by the same run that
    # applies this state, after the state modules are loaded.
    return __virtualname__


def imported(name, source, cache_path=None, plain_http=False):
    """
    Import a boot cache image into the cache with `imagecachectl import`.

    name
        Name of the cache resource, such as `worker-134-0-0-dev`
    source
        Path of a docker archive, or an image reference to pull
    cache_path
        Root of the image cache, the `imagecachectl` default if not set
    plain_http
        Talk plain HTTP to the registry
    """
    ret = {"name": name, "result": False, "changes": {}, "comment": ""}

    command = ["imagecachectl", "import", "--name", name]
    if cache_path:
        command.extend(["--cache-path", cache_path])
    if plain_http:
        command.append("--plain-http")
    command.append(source)

    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = f"Would run: {' '.join(command)}"
        return ret

    try:
        out = __salt__["cmd.run_all"](command, python_shell=False)
    except CommandExecutionError as exc:
        # Raised when the command cannot start at all, e.g. a missing binary.
        ret["comment"] = f"Failed to run imagecachectl: {exc}"
        return ret

    if out["retcode"] != 0:
        # The comment reaches the state output, the log reaches the minion
        # log, which is where a failed deployment gets read from.
        log.error('Failed to import "%s" from "%s": %s', name, source, out["stderr"])
        ret["comment"] = (
            f"imagecachectl exited with code {out['retcode']}: {out['stderr']}"
        )
        return ret

    ret["result"] = True
    ret["comment"] = out["stdout"].strip()
    if _ALREADY_HELD not in out["stdout"]:
        ret["changes"] = {"imported": source}

    return ret
