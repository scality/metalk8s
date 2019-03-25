import fnmatch
import logging

try:
    import kubernetes.client
    import kubernetes.config
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False


log = logging.getLogger(__name__)


__virtualname__ = 'kubernetes'


def __virtual__():
    if HAS_DEPS:
        return HAS_DEPS
    else:
        return False, 'Unable to load the kubernetes nodes roster: '\
            'dependencies for Kubernetes Python client library '\
            'are unavailable.'


def targets(tgt, tgt_type='glob', **kwargs):
    if tgt_type != 'glob':
        log.error('Only "glob" lookups are supported for now')
        return {}

    try:
        client = kubernetes.config.new_client_from_config(
            config_file='/etc/kubernetes/admin.conf',
        )
    except:
        log.exception('Failed to load kubeconfig')
        raise

    v1 = kubernetes.client.CoreV1Api(api_client=client)
    try:
        nodes = v1.list_node()
    except:
        log.exception('Failed to retrieve v1/NodeList')
        raise

    # TODO Use `tgt_type`
    prefix = 'metalk8s.scality.com/ssh-'
    targets = {}
    for item in nodes.items:
        if fnmatch.fnmatch(item.metadata.name, tgt):
            annotations = item.metadata.annotations
            targets[item.metadata.name] = {
                # Assume node name is resolvable
                'host': annotations.get(prefix + 'host', item.metadata.name),
                'port': int(annotations.get(prefix + 'port', 22)),
                'user': annotations.get(prefix + 'user', 'root'),
                'priv': annotations.get(prefix + 'key-path', 'salt-ssh.rsa'),
                'sudo': bool(annotations.get(prefix + 'sudo', False)),
                'minion_opts': {'use_superseded': ['module.run']},
            }
    return targets
