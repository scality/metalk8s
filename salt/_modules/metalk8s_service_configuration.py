"""Metalk8s cluster and service configuration utility."""

import logging
import yaml

import salt
from salt.exceptions import CommandExecutionError


log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_service_configuration"


def __virtual__():
    return __virtualname__


def get_service_conf(
    namespace, configmap_name, default_csc, apiVersion=None, kind=None
):
    """Reads a ConfigMap from the name specified

    Arguments:
        configmap_name: the ConfigMap name
        namespace: the Namespace where the ConfigMap is stored
        default_csc: the CSC imported from YAML file

    Returns:
        A dict of a specific service configuration

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_service_configuration.get_service_conf
            "metalk8s-monitoring" "metalk8s-prometheus-config"
            '{"apiVersion":"addons.metalk8s.scality.com","kind":"PrometheusConfig","spec":{"deployment":{"replicas":1}}}'
    """

    if not configmap_name:
        raise CommandExecutionError(
            f"Expected a ConfigMap name but got {configmap_name}"
        )
    if not isinstance(default_csc, dict):
        raise CommandExecutionError(
            f"Expected default CSC for ConfigMap {configmap_name} but got {default_csc}"
        )

    try:
        manifest = __salt__["metalk8s_kubernetes.get_object"](
            kind="ConfigMap", apiVersion="v1", namespace=namespace, name=configmap_name
        )
    except ValueError as exc:
        raise CommandExecutionError(
            f"Failed to read ConfigMap object {configmap_name}"
        ) from exc

    if manifest is None:
        return default_csc

    try:
        conf_section = manifest.get("data", {}).get("config.yaml", {})
        config = yaml.safe_load(conf_section) or {}
    except yaml.YAMLError as exc:
        raise CommandExecutionError(
            f"Invalid YAML format in ConfigMap {configmap_name}"
        ) from exc
    except Exception as exc:
        raise CommandExecutionError(
            f"Failed loading `config.yaml` from ConfigMap {configmap_name}"
        ) from exc
    if not config:
        raise CommandExecutionError(
            f"Expected `config.yaml` as yaml in the ConfigMap {configmap_name} but got {config}"
        )
    if apiVersion and config["apiVersion"] != apiVersion:
        raise CommandExecutionError(
            f"Expected value {apiVersion} for key apiVersion, got {config['apiVersion']}"
        )
    if kind and config["kind"] != kind:
        raise CommandExecutionError(
            f"Expected value {kind} for key kind, got {config['kind']}"
        )
    merged_config = salt.utils.dictupdate.merge(
        default_csc, config, strategy="recurse", merge_lists=True
    )

    return merged_config


def get_pod_affinity(affinities, label_selector, namespaces):
    """Convert human readable affinity to real Kubernetes affinity

    NOTE: This function only handle podAntiAffinity for the moment

    Input look like
    ```yaml
    podAntiAffinity:
        hard:
            - topologyKey: kubernetes.io/hostname
        soft:
            - topologyKey: my.topology.key/important
              weight: 100
            - topologyKey: my.topology.key/a.bit.less.important
    ```

    Args:
        value (dict): Simple dict affinity
        label_selector (dict): Dict for label selector to match Pods for this affinity
        namespaces (list): List of namespaces where those Pods sits

    Returns:
        A dict that can be used as `affinity` in a Kubernetes object
    """
    if not isinstance(namespaces, list):
        namespaces = [namespaces]

    result = {}
    res_pod_anti_affinity = {}

    pod_anti_affinity = (affinities or {}).get("podAntiAffinity") or {}

    for soft_affinity in pod_anti_affinity.get("soft") or []:
        res_pod_anti_affinity.setdefault(
            "preferredDuringSchedulingIgnoredDuringExecution", []
        ).append(
            {
                "weight": soft_affinity.get("weight", 1),
                "podAffinityTerm": {
                    "labelSelector": {"matchLabels": label_selector},
                    "namespaces": namespaces,
                    "topologyKey": soft_affinity["topologyKey"],
                },
            }
        )

    for hard_affinity in pod_anti_affinity.get("hard") or []:
        res_pod_anti_affinity.setdefault(
            "requiredDuringSchedulingIgnoredDuringExecution", []
        ).append(
            {
                "labelSelector": {"matchLabels": label_selector},
                "namespaces": namespaces,
                "topologyKey": hard_affinity["topologyKey"],
            }
        )

    if res_pod_anti_affinity:
        result["podAntiAffinity"] = res_pod_anti_affinity

    return result
