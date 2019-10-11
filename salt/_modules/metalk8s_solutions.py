'''
Various utilities to manage Solutions.
'''
import collections
import json
import logging

import yaml

from salt.exceptions import CommandExecutionError

MISSING_DEPS = []
try:
    import kubernetes.client
    from kubernetes.client.rest import ApiException
except ImportError:
    MISSING_DEPS.append('kubernetes.client')

try:
    from urllib3.exceptions import HTTPError
except ImportError:
    MISSING_DEPS.append('urllib3')

log = logging.getLogger(__name__)

SOLUTIONS_NAMESPACE = 'metalk8s-solutions'
SOLUTIONS_CONFIG_FILE = '/etc/metalk8s/solutions.yaml'
SUPPORTED_CONFIG_VERSIONS = frozenset((
    'solutions.metalk8s.scality.com/{}'.format(version)
    for version in ['v1alpha1']
))

__virtualname__ = 'metalk8s_solutions'


def __virtual__():
    if MISSING_DEPS:
        return False, 'Missing dependencies: {}'.format(
            ', '.join(MISSING_DEPS)
        )
    return __virtualname__


def _is_solution_mount(mountpoint, mount_info):
    """Return whether a mount is for a Solution archive.

    Any ISO9660 mounted in `/srv/scality` that isn't for MetalK8s is considered
    to be a Solution archive.
    """
    if not mountpoint.startswith('/srv/scality/'):
        return False

    if mountpoint.startswith('/srv/scality/metalk8s-'):
        return False

    if mount_info['fstype'] != 'iso9660':
        return False

    return True


def list_available():
    result = collections.defaultdict(list)

    active_mounts = __salt__['mount.active']()
    solutions_mounts = filter(_is_solution_mount, active_mounts.items())

    active_solutions = list_active()

    for mountpoint, mount_info in solution_mounts:
        solution_info = __salt__['metalk8s.archive_info_from_iso'](
            mount_info['alt_device']
        )

        machine_name = solution_info['name'].replace(' ', '-').lower()
        version = solution_info['version']
        active = active_solutions.get(machine_name) == version

        result[machine_name].append({
            'display_name': solution_info['name'],
            'machine_id': '{}-{}'.format(machine_name, version),
            'mountpoint': mountpoint,
            'archive': mount_info['alt_device'],
            'version': version,
            'active': False,
        })

    return result


def list_active(
    context="kubernetes-admin@kubernetes",
    kubeconfig="/etc/kubernetes/admin.conf",
):
    """List all Solution versions for which components are deployed.

    Currently only checks Admin UIs `Service` objects, using labels to
    determine if these objects are actually what we think they are.
    FIXME: this approach is really brittle.
    """
    all_service_names = __salt__['metalk8s_kubernetes.services'](
        namespace=SOLUTIONS_NAMESPACE,
        context=context,
        kubeconfig=kubeconfig,
    )

    result = {}
    for service_name in all_service_names:
        # FIXME: get rid of this stupidity, we should not need multiple calls
        service = __salt__['metalk8s_kubernetes.show_service'](
            name=service_name,
            namespace=SOLUTIONS_NAMESPACE,
            context=context,
            kubeconfig=kubeconfig,
        )
        labels = service.metadata.labels or {}

        if labels.get("app.kubernetes.io/component") != "ui":
            # Not an Admin UI, ignoring for this list
            continue

        try:
            solution_name = labels["app.kubernetes.io/part-of"]
            solution_version = labels["app.kubernetes.io/version"]
        except KeyError:
            # FIXME: ignoring invalid Service objects for now, though it may
            #        make sense to fail instead
            continue

        if solution_name in result:
            raise CommandExecutionError(
                "Found multiple UI Services in '{}' namespace belonging to "
                "the same Solution. Only one Admin UI per Solution is "
                "supported.".format(SOLUTIONS_NAMESPACE)
            )

        result[solution_name] = solution_version
    return result


def read_config():
    """Read the SolutionsConfiguration file."""
    try:
        with open(SOLUTIONS_CONFIG_FILE, 'r') as fd:
            config = yaml.safe_load(fd)
    except Exception as exc:
        msg = 'Failed to load "{}": {}'.format(SOLUTIONS_CONFIG_FILE, str(exc))
        raise CommandExecutionError(message=msg)

    if config.get('kind') != 'SolutionsConfiguration':
        raise CommandExecutionError(
            'Invalid `kind` in configuration ({}), '
            'must be "SolutionsConfiguration"'.format(config.get('kind'))
        )

    if config.get('apiVersion') not in SUPPORTED_CONFIG_VERSIONS:
        raise CommandExecutionError(
            'Invalid `apiVersion` in configuration ({}), '
            'must be one of: {}'.format(
                config.get('apiVersion'),
                ', '.join(SUPPORTED_CONFIG_VERSIONS)
            )
        )

    config.setdefault('archives', [])
    config.setdefault('active', {})

    return config


# TODO: remove those two methods
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
    # If this is the last registered version then remove all the entry
    if new_versions == []:
        del configmap['data'][name]
        # Patching a CM while removing a key does not work, we need to replace it
        try:
            api_instance.replace_namespaced_config_map(
                SOLUTIONS_CONFIG_MAP,
                SOLUTIONS_CONFIG_MAP_NAMESPACE,
                configmap
            )
        except ApiException as exc:
            log.exception('Failed to patch ConfigMap "%s": %s',
                          SOLUTIONS_CONFIG_MAP, str(exc))
            return False
    else:
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
