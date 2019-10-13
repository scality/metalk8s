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
