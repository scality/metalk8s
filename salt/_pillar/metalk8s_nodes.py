import os.path
import logging

try:
    import kubernetes.client
    import kubernetes.config
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False


VERSION_LABEL = 'metalk8s.scality.com/version'
ROLE_LABEL_PREFIX = 'node-role.kubernetes.io/'


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_nodes'


def __virtual__():
    if HAS_DEPS:
        return __virtualname__
    else:
        return False, 'Missing Kubernetes client library dependency'


def node_info(node, ca_minion):
    result = {
        'roles': [],
        'version': None,
    }

    roles = set()

    if VERSION_LABEL in node.metadata.labels:
        result['version'] = node.metadata.labels[VERSION_LABEL]

    for (label, value) in node.metadata.labels.items():
        if label.startswith(ROLE_LABEL_PREFIX):
            role = label[len(ROLE_LABEL_PREFIX):]
            if role:
                roles.add(role)

    if node.metadata.name == ca_minion:
        roles.add('ca')

    result['roles'] = list(roles)

    return result


def ext_pillar(minion_id, pillar, kubeconfig):
    if not os.path.isfile(kubeconfig):
        error_tplt = '{}: kubeconfig not found at {}'
        pillar_nodes = __utils__['pillar_utils.errors_to_dict']([
            error_tplt.format(__virtualname__, kubeconfig)
        ])
        cluster_version = pillar_nodes

    else:
        ca_minion = None
        if 'metalk8s' in pillar:
            if 'ca' in pillar['metalk8s']:
                ca_minion = pillar['metalk8s']['ca'].get('minion', None)

        client = kubernetes.config.new_client_from_config(
            config_file=kubeconfig,
        )

        coreV1 = kubernetes.client.CoreV1Api(api_client=client)

        node_list = coreV1.list_node()

        cluster_version = None
        namespace_information = coreV1.read_namespace(name="kube-system")

        if namespace_information:
            ns_info_dict = namespace_information.to_dict()
            annotation_info = ns_info_dict.get(
                'metadata', {}).get('annotations')
            if annotation_info:
                cluster_version = annotation_info.get(
                    'metalk8s.scality.com/cluster-version'
                )
        if not cluster_version:
            cluster_version = __utils__['pillar_utils.errors_to_dict'](
                'Unable to retrieve cluster version'
            )
        pillar_nodes = dict(
            (node.metadata.name, node_info(node, ca_minion))
            for node in node_list.items
        )

    return {
        'metalk8s': {
            'nodes': pillar_nodes,
            'cluster_version': cluster_version,
        },
    }
