import logging
log = logging.getLogger(__name__)

try:
    import kubernetes.client
    import kubernetes.config
    HAS_DEPS = True
except ImportError:
    log.exception('Unable to load dependencies')
    HAS_DEPS = True

__virtualname__ = 'kubernetes'

def __virtual__():
    return HAS_DEPS

def ext_pillar(minion_id, pillar, *args, **kwargs):
    client = None
    try:
        client = kubernetes.config.new_client_from_config(
            config_file='/etc/kubernetes/admin.conf'
        )
    except:
        log.exception('Failed to load kubeconfig')
        raise

    v1 = kubernetes.client.CoreV1Api(api_client=client)

    node = None
    try:
        node = v1.read_node(minion_id)
    except:
        log.exception('Failed to retrieve v1/Node %r', minion_id)
        raise

    return {'kubernetes': {'node': node.to_dict(), }, }
