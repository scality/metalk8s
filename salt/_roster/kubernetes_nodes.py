import fnmatch
import logging
log = logging.getLogger(__name__)

try:
    import kubernetes.client
    import kubernetes.config
    HAS_DEPS = True
except ImportError:
    log.exception('Unable to load dependencies')
    HAS_DEPS = False

__virtualname__ = 'kubernetes'

def __virtual__():
    return HAS_DEPS

def targets(tgt, tgt_type='glob', **kwargs):
    if tgt_type != 'glob':
        log.error('Only "glob" lookups are supported for now')
        return {}

    client = None
    try:
        client = kubernetes.config.new_client_from_config(
            config_file='/etc/kubernetes/admin.conf',
        )
    except:
        log.exception('Failed to load kubeconfig')
        raise

    v1 = kubernetes.client.CoreV1Api(api_client=client)

    nodes = None
    try:
        nodes = v1.list_node()
    except:
        log.exception('Failed to retrieve v1/NodeList')
        raise

    # TODO Use `tgt_type`
    return {
        item.metadata.name: {
            # Assume node name is resolvable
            'host': item.metadata.annotations.get('ssh-host', item.metadata.name),
            'port': int(item.metadata.annotations.get('ssh-port', 22)),
            'user': item.metadata.annotations.get('ssh-user', 'root'),
            'sudo': True,
        } for item in nodes.items
        if fnmatch.fnmatch(item.metadata.name, tgt)
    }
