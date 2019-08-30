import os.path
import logging
import datetime

try:
    import kubernetes.client
    from kubernetes.client.rest import ApiException
    import kubernetes.config
    from urllib3.exceptions import HTTPError
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


def get_cluster_version(api_client):
    coreV1 = kubernetes.client.CoreV1Api(api_client=api_client)
    try:
        namespace = coreV1.read_namespace(name="kube-system")
    except (ApiException, HTTPError) as exc:
        return __utils__['pillar_utils.errors_to_dict'](
            'Unable to read namespace information {}'.format(exc)
        )
    annotations = namespace.metadata.annotations
    annotation_key = 'metalk8s.scality.com/cluster-version'
    if not annotations or annotation_key not in annotations:
        return __utils__['pillar_utils.errors_to_dict'](
            'Unable to retrieve cluster version'
        )

    return namespace.metadata.annotations[annotation_key]


def iso_timestamp_converter(timestamp):
    if timestamp is None:
        return None
    return timestamp.isoformat()


def get_storage_classes(api_client):
    storageV1 = kubernetes.client.StorageV1Api(api_client=api_client)
    storage_classes = {}
    storageclass_list = storageV1.list_storage_class()
    for storageclass in storageclass_list.items:
        # Need to convert the datetime object in storageclass to ISO format in
        # order to make them serializable.
        storageclass.metadata.creation_timestamp = iso_timestamp_converter(
            storageclass.metadata.creation_timestamp
        )
        storageclass.metadata.deletion_timestamp = iso_timestamp_converter(
            storageclass.metadata.deletion_timestamp
        )
        storage_classes[storageclass.metadata.name] = storageclass.to_dict()

    return storage_classes


def list_volumes(api_client, minion_id):
    customObjectsApi = kubernetes.client.CustomObjectsApi(
        api_client=api_client
    )
    try:
        storage_classes = get_storage_classes(api_client)
    except (ApiException, HTTPError) as exc:
        error_tplt = (
            'Exception while calling StorageV1->list_storage_class {}'
        )
        return __utils__['pillar_utils.errors_to_dict'](
            [error_tplt.format(exc)]
        )

    try:
        volumes = customObjectsApi.list_cluster_custom_object(
            group="storage.metalk8s.scality.com",
            version="v1alpha1",
            plural="volumes"
        )
    except (ApiException, HTTPError) as exc:
        error_tplt = (
            'Exception while calling CustomObjectsAPi->list_custom_object {}'
        )
        return __utils__['pillar_utils.errors_to_dict'](
            [error_tplt.format(exc)]
        )

    results = {}
    local_volumes = (
        volume for volume in volumes['items']
        if volume['spec']['nodeName'] == minion_id
    )
    for volume in local_volumes:
        name = volume['metadata']['name']
        storageclass = storage_classes.get(
            volume['spec']['storageClassName'],
            volume['spec']['storageClassName']
        )
        volume['spec']['storageClassName'] = storageclass
        name = volume['metadata']['name']
        results[name] = volume

    return results


def ext_pillar(minion_id, pillar, kubeconfig):
    if not os.path.isfile(kubeconfig):
        error_tplt = '{}: kubeconfig not found at {}'
        pillar_nodes = __utils__['pillar_utils.errors_to_dict']([
            error_tplt.format(__virtualname__, kubeconfig)
        ])
        cluster_version = pillar_nodes
        volume_information = pillar_nodes

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

        cluster_version = get_cluster_version(api_client=client)
        pillar_nodes = dict(
            (node.metadata.name, node_info(node, ca_minion))
            for node in node_list.items
        )

        volume_information = list_volumes(client, minion_id)

    result = {
        'metalk8s': {
            'nodes': pillar_nodes,
            'cluster_version': cluster_version,
            'volumes': volume_information,
        },
    }
    for key in ['nodes', 'volumes']:
        __utils__['pillar_utils.promote_errors'](result['metalk8s'], key)

    return result
