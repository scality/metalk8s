from kubernetes import client as k8s_client
from kubernetes import config as k8s_config


NAMESPACED_RESOURCES = {
    'daemon_set': 'AppsV1Api',
    'deployment': 'AppsV1Api',
    'stateful_set': 'AppsV1Api',
    'job': 'BatchV1Api',
    'service': 'CoreV1Api',
    'pod': 'CoreV1Api',
    'cron_job': 'BatchV1beta1Api',
}
CLUSTER_RESOURCES = {
    'persistent_volume': 'CoreV1Api'
}


def _find_resource_name(resource):
    for resource_name, api in NAMESPACED_RESOURCES.items():
        if resource.lower() == resource_name.replace('_', ''):
            return resource_name, api, True  # namespaced_resource
    for resource_name, api in CLUSTER_RESOURCES.items():
        if resource.lower() == resource_name.replace('_', ''):
            return resource_name, api, False  # cluster_resource
    else:
        raise ValueError('Unknown resource {} should be part of {}'.format(
            resource, NAMESPACED_RESOURCES.keys() | CLUSTER_RESOURCES.keys()))


def get_kube_resources(kubeconfig, resource, namespace='default', name=None):
    k8s_config.load_kube_config(config_file=kubeconfig)
    res_name, api_name, namespaced_resource = _find_resource_name(resource)
    api = getattr(k8s_client, api_name)()
    if name is None:
        if namespace is None and namespaced_resource:
            resources = getattr(api, 'list_' + res_name + '_all_namespaces')()
        elif namespace is not None and namespaced_resource:
            resources = getattr(api, 'list_namespaced_' + res_name)(
                namespace=namespace)
        else:  # not namespaced_resource
            resources = getattr(api, 'list_' + res_name)()

    else:
        if namespace is not None and namespaced_resource:
            resources = getattr(api, 'read_namespaced_' + res_name)(
                namespace=namespace, name=name)
        elif not namespaced_resource:
            resources = getattr(api, 'read_' + res_name)(name=name)
        else:
            raise ValueError('Cannot get a specific name, without namespace')
    return resources
