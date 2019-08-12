'''
Various utilities to manage Solutions.
'''
import json
import logging
import yaml

from salt.exceptions import CommandExecutionError

HAS_LIBS = True
SOLUTIONS_CONFIG_MAP = 'metalk8s-solutions'
SOLUTIONS_CONFIG_MAP_NAMESPACE = 'metalk8s-solutions'
SOLUTIONS_CONFIG_FILE = '/etc/metalk8s/solutions.yaml'
try:
    import kubernetes.client
    from kubernetes.client.rest import ApiException
    from urllib3.exceptions import HTTPError
except ImportError:
    HAS_LIBS = False

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_solutions'


def __virtual__():
    if HAS_LIBS:
        return __virtualname__
    else:
        return False, 'python kubernetes library not found'


def list_deployed(
    context="kubernetes-admin@kubernetes",
    kubeconfig="/etc/kubernetes/admin.conf"
):
    """Get all deployed Solution versions from a known ConfigMap."""
    response_dict = __salt__['metalk8s_kubernetes.show_configmap'](
        SOLUTIONS_CONFIG_MAP,
        namespace=SOLUTIONS_CONFIG_MAP_NAMESPACE,
        context=context,
        kubeconfig=kubeconfig,
    )
    if not response_dict or not response_dict.get('data'):
        return {}

    return {
        name: json.loads(versions_str)
        for name, versions_str in response_dict['data'].items()
    }


def list_configured():
    """Get list of Solution archives paths defined in a config file."""
    try:
        with open(SOLUTIONS_CONFIG_FILE, 'r') as fd:
            content = yaml.safe_load(fd)
    except Exception as exc:
        log.exception('Failed to load "%s": %s',
                      SOLUTIONS_CONFIG_FILE, str(exc))
        raise CommandExecutionError()

    return content.get('archives', [])


def register_solution_version(
    name,
    version,
    archive_path,
    deployed=False,
    context="kubernetes-admin@kubernetes",
    kubeconfig="/etc/kubernetes/admin.conf"
):
    """Add a Solution version to the ConfigMap."""
    cfg = __salt__['metalk8s_kubernetes.setup_conn'](
        context=context,
        kubeconfig=kubeconfig
    )
    api_instance = kubernetes.client.CoreV1Api()

    # Retrieve the existing ConfigMap
    configmap = __salt__['metalk8s_kubernetes.show_configmap'](
        SOLUTIONS_CONFIG_MAP,
        namespace=SOLUTIONS_CONFIG_MAP_NAMESPACE,
        context=context,
        kubeconfig=kubeconfig,
    )
    if configmap is None:
        configmap = __salt__['metalk8s_kubernetes.create_configmap'](
            SOLUTIONS_CONFIG_MAP,
            namespace=SOLUTIONS_CONFIG_MAP_NAMESPACE,
            data=None,
            context=context,
            kubeconfig=kubeconfig,
        )

    all_versions_str = (configmap.get('data') or {}).get(name, '[]')
    all_versions = json.loads(all_versions_str)

    for version_dict in all_versions:
        if version_dict['version'] == version:
            version_dict['iso'] = archive_path
            version_dict['deployed'] = deployed
            break
    else:
        all_versions.append({
            'version': version,
            'iso': archive_path,
            'deployed': deployed,
        })

    body = {'data': {name: json.dumps(all_versions)}}

    try: 
        api_instance.patch_namespaced_config_map(
            SOLUTIONS_CONFIG_MAP,
            SOLUTIONS_CONFIG_MAP_NAMESPACE,
            body
        )
    except ApiException as exc:
        log.exception('Failed to patch ConfigMap "%s": %s',
                      SOLUTIONS_CONFIG_MAP, exc)
        return False

    return True

def unregister_solution_version(
    name,
    version,
    context="kubernetes-admin@kubernetes",
    kubeconfig="/etc/kubernetes/admin.conf"
):
    """Remove a Solution version from the ConfigMap."""
    cfg = __salt__['metalk8s_kubernetes.setup_conn'](
        context=context,
        kubeconfig=kubeconfig
    )
    api_instance = kubernetes.client.CoreV1Api()

    # Retrieve the existing ConfigMap
    configmap = __salt__['metalk8s_kubernetes.show_configmap'](
        SOLUTIONS_CONFIG_MAP,
        namespace=SOLUTIONS_CONFIG_MAP_NAMESPACE,
        context=context,
        kubeconfig=kubeconfig,
    )
    if not configmap:
        log.exception(
            'Cannot unregister Solution: ConfigMap "%s" is missing.',
            SOLUTIONS_CONFIG_MAP
        )
        return False

    old_versions = json.loads((configmap['data'] or {}).get(name, '[]'))
    new_versions = [
        version_dict for version_dict in old_versions
        if version_dict['version'] != version
    ]

    body = {'data': {name: json.dumps(new_versions)}}

    try:
        api_instance.patch_namespaced_config_map(
            SOLUTIONS_CONFIG_MAP,
            SOLUTIONS_CONFIG_MAP_NAMESPACE,
            body
        )
    except ApiException as exc:
        log.exception('Failed to patch ConfigMap "%s": %s',
                      SOLUTIONS_CONFIG_MAP, str(exc))
        return False

    return True