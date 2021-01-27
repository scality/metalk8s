"""Utility methods for Solutions management.

This module contains only K8s operations, see `metalk8s_solutions.py` for the
for the rest of the operations in the virtual `metalk8s_solutions` module.
"""
import json
import logging

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_solutions"

SOLUTIONS_NAMESPACE = "metalk8s-solutions"
SOLUTIONS_CONFIGMAP_NAME = "metalk8s-solutions"
ENVIRONMENT_LABEL = "solutions.metalk8s.scality.com/environment"
ENVIRONMENT_DESCRIPTION_ANNOTATION = (
    "solutions.metalk8s.scality.com/environment-description"
)
ENVIRONMENT_CONFIGMAP_NAME = "metalk8s-environment"


def __virtual__():
    # TODO: consider checking methods from metalk8s_kubernetes
    return __virtualname__


def list_active(**kwargs):
    """List all Solution versions for which components are deployed.

    Currently relies on the ConfigMap that is managed in the
    `deploy-components` orchestration.
    """
    solutions_config = __salt__["metalk8s_kubernetes.get_object"](
        kind="ConfigMap",
        apiVersion="v1",
        name=SOLUTIONS_CONFIGMAP_NAME,
        namespace=SOLUTIONS_NAMESPACE,
        **kwargs
    )
    result = {}

    if solutions_config is None:
        return result

    for name, versions_str in (solutions_config.get("data") or {}).items():
        versions = json.loads(versions_str)
        active_version = next(
            (version["version"] for version in versions if version["active"]), None
        )
        if active_version is not None:
            result[name] = active_version

    return result


def list_environments(**kwargs):
    """List all Environments (through labelled namespaces) and their config.

    Each Environment can be made up of multiple namespaces, though only one
    ConfigMap will be used to determine the Environment configuration (the
    first one found will be selected).
    """
    env_namespaces = __salt__["metalk8s_kubernetes.list_objects"](
        kind="Namespace",
        apiVersion="v1",
        label_selector=ENVIRONMENT_LABEL,  # just testing existence, not value
        **kwargs
    )

    environments = {}
    for namespace in env_namespaces:
        name = namespace["metadata"]["labels"][ENVIRONMENT_LABEL]
        env = environments.setdefault(name, {"name": name})

        description = (namespace["metadata"].get("annotations") or {}).get(
            ENVIRONMENT_DESCRIPTION_ANNOTATION
        )
        if description is not None and "description" not in env:
            env["description"] = description

        namespaces = env.setdefault("namespaces", {})

        config = (
            __salt__["metalk8s_kubernetes.get_object"](
                kind="ConfigMap",
                apiVersion="v1",
                name=ENVIRONMENT_CONFIGMAP_NAME,
                namespace=namespace["metadata"]["name"],
                **kwargs
            )
            or {}
        )

        namespaces[namespace["metadata"]["name"]] = {"config": config.get("data")}

    return environments
