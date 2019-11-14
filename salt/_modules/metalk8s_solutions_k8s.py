"""Utility methods for Solutions management.

This module contains only K8s operations, see `metalk8s_solutions.py` for the
for the rest of the operations in the virtual `metalk8s_solutions` module.
"""
import logging

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_solutions'

SOLUTIONS_NAMESPACE = 'metalk8s-solutions'
ENVIRONMENT_LABEL = 'solutions.metalk8s.scality.com/environment'
ENVIRONMENT_DESCRIPTION_ANNOTATION = \
    'solutions.metalk8s.scality.com/environment-description'
ENVIRONMENT_CONFIGMAP_NAME = 'metalk8s-environment'


def __virtual__():
    if 'metalk8s_kubernetes.services' not in __salt__:
        return False, "Failed to load 'metalk8s_kubernetes' module"
    return __virtualname__


def list_active(
    context="kubernetes-admin@kubernetes",
    kubeconfig="/etc/kubernetes/admin.conf",
):
    """List all Solution versions for which components are deployed.

    Currently only checks Admin UIs `Service` objects, using labels to
    determine if these objects are actually what we think they are.
    FIXME: this approach can be brittle.
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
        labels = service.get('metadata', {}).get('labels', {})

        if labels.get("app.kubernetes.io/component") != "ui":
            # Not an Admin UI, ignoring for this list
            continue

        try:
            solution_name = labels["app.kubernetes.io/part-of"]
            solution_version = labels["app.kubernetes.io/version"]
        except KeyError:
            log.warn("Ignoring UI Service '%s' due to missing labels.",
                     service_name)
            continue

        if solution_name in result:
            raise CommandExecutionError(
                "Found multiple UI Services in '{}' namespace belonging to "
                "the same Solution. Only one Admin UI per Solution is "
                "supported.".format(SOLUTIONS_NAMESPACE)
            )

        result[solution_name] = solution_version

    return result


def list_environments(
    context="kubernetes-admin@kubernetes",
    kubeconfig="/etc/kubernetes/admin.conf",
):
    """List all Environments (through labelled namespaces) and their config.

    Each Environment can be made up of multiple namespaces, though only one
    ConfigMap will be used to determine the Environment configuration (the
    first one found will be selected).
    """
    env_namespaces = __salt__['metalk8s_kubernetes.list_objects'](
        kind='Namespace',
        apiVersion='v1',
        # FIXME: add support for labelSelector
        labelSelector=ENVIRONMENT_LABEL,  # just testing existence, not value
        context=context,
        kubeconfig=kubeconfig,
    )

    environments = {}
    for namespace in env_namespaces:
        name = namespace['metadata']['labels'][ENVIRONMENT_LABEL]
        env = environments.setdefault(name, {'name': name})

        description = namespace['metadata'].get('annotations', {}).get(
            ENVIRONMENT_DESCRIPTION_ANNOTATION
        )
        if description is not None and 'description' not in env:
            env['description'] = description

        namespaces = env.setdefault('namespaces', [])
        namespaces.append(namespace)

        config = __salt__['metalk8s_kubernetes.get_object'](
            kind='ConfigMap',
            apiVersion='v1',
            name=ENVIRONMENT_CONFIGMAP_NAME,
            namespace=namespace['metadata']['name'],
            context=context,
            kubeconfig=kubeconfig,
        )
        if config is not None and 'config' not in env:
            env['config'] = config.get('data', {})

    return environments
