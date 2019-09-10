import errno
import logging


SA_PRIVATE_KEY_PATH = "/etc/kubernetes/pki/sa.key"
APISERVER_KEY_PATH = "/etc/metalk8s/crypt/apiserver.key"

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_private"


def __virtual__():
    return __virtualname__


def _read_private_key(key_name, key_path):
    try:
        with open(key_path, "r") as key_file:
            key_data = key_file.read()
    except IOError as exn:
        if exn.errno == errno.ENOENT:
            err_msg = "Missing {0} key file to share with master node at {1}."
            return {"_errors": [err_msg.format(key_name, key_path)]}
        err_msg = "Unable to read {0} key file contents at {1} - {2}."
        return {"_errors": [err_msg.format(key_name, key_path, str(exn))]}

    return {key_name: key_data}


def _read_sa_private_key():
    # FIXME: we only have access to this file because:
    #   1- Salt master Pod mounts all of /etc/kubernetes
    #   2- Salt master Pod runs on the 'bootstrap' minion, which is, by chance,
    #      also the 'ca' minion, the owner of this key
    # Suggestion: read through https://github.com/saltstack/salt/issues/45882
    return _read_private_key("sa_private_key", SA_PRIVATE_KEY_PATH)


def _read_apiserver_key():
    # FIXME: we only have access to this file because:
    #   1- Salt master Pod mounts all of /etc/metalk8s
    #   2- Salt master Pod runs on the 'bootstrap' minion, which is, by chance,
    #      also the initial master node
    return _read_private_key("apiserver_key", APISERVER_KEY_PATH)


def ext_pillar(minion_id, pillar):
    nodes_info = pillar.get("metalk8s", {}).get("nodes", {})

    if minion_id not in nodes_info:
        log.debug(
            "No information about minion '%s' in K8s API, skipping.", minion_id
        )
        return {}

    node_info = nodes_info[minion_id]

    private_data = {'private': None}

    if "master" in node_info["roles"]:
        data = {}
        data.update(_read_sa_private_key())
        data.update(_read_apiserver_key())
        private_data['private'] = data
        __utils__['pillar_utils.promote_errors'](private_data, 'private')

    result = {"metalk8s": private_data}

    return result
