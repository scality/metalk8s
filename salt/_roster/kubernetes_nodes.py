import fnmatch
import logging
from pathlib import Path

log = logging.getLogger(__name__)


__virtualname__ = "kubernetes"

# Absolute path of the salt-ssh `ssh_pre_flight` script on the salt-master.
# The script is deployed by `metalk8s.salt.master.configured` so that this
# roster only has to reference a stable, well-known location.
PREFLIGHT_PATH = Path("/etc/salt/ssh-preflight.sh")


def __virtual__():
    return __virtualname__


def targets(tgt, tgt_type="glob", **_kwargs):
    if tgt_type not in ["glob", "list"]:
        log.error('Only "glob" and "list" lookups are supported for now')
        return {}

    try:
        nodes = __runner__["salt.cmd"](
            "metalk8s_kubernetes.list_objects", kind="Node", apiVersion="v1"
        )
    except Exception:
        log.exception("Failed to retrieve v1/NodeList")
        raise

    has_preflight = PREFLIGHT_PATH.exists()
    if not has_preflight:
        log.warning(
            "salt-ssh pre-flight script %s is missing; new nodes will not "
            "get a Python 3 interpreter installed automatically",
            PREFLIGHT_PATH,
        )

    # TODO Use `tgt_type`
    prefix = "metalk8s.scality.com/ssh-"
    targets = {}
    for item in nodes:
        match = False
        node_name = item["metadata"]["name"]
        if tgt_type == "glob":
            if fnmatch.fnmatch(node_name, tgt):
                match = True
        elif tgt_type == "list":
            if node_name in tgt:
                match = True

        if match:
            annotations = item["metadata"]["annotations"]
            use_sudo = bool(annotations.get(prefix + "sudo", False))
            target = {
                # Assume node name is resolvable
                "host": annotations.get(prefix + "host", node_name),
                "port": int(annotations.get(prefix + "port", 22)),
                "user": annotations.get(prefix + "user", "root"),
                "priv": annotations.get(prefix + "key-path", "salt-ssh.rsa"),
                "sudo": use_sudo,
            }
            if has_preflight:
                target["ssh_pre_flight"] = PREFLIGHT_PATH
                # Forward the privilege-escalation command to the preflight
                # script so it mirrors the per-target `sudo` flag instead of
                # probing the runtime UID itself.
                target["ssh_pre_flight_args"] = "sudo" if use_sudo else ""
            targets[node_name] = target
    return targets
