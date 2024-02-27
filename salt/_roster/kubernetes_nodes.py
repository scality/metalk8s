import fnmatch
import logging

log = logging.getLogger(__name__)


__virtualname__ = "kubernetes"


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
            targets[node_name] = {
                # Assume node name is resolvable
                "host": annotations.get(prefix + "host", node_name),
                "port": int(annotations.get(prefix + "port", 22)),
                "user": annotations.get(prefix + "user", "root"),
                "priv": annotations.get(prefix + "key-path", "salt-ssh.rsa"),
                "sudo": bool(annotations.get(prefix + "sudo", False)),
            }
    return targets
