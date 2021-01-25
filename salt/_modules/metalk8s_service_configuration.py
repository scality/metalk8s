'''Metalk8s cluster and service configuration utility.'''

import logging
import yaml

import salt
from salt.exceptions import CommandExecutionError


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_service_configuration'


def __virtual__():
    return __virtualname__


def get_service_conf(
    namespace,
    configmap_name,
    default_csc,
    apiVersion=None,
    kind=None,
    **kwargs
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
            'Expected a ConfigMap name but got {}'.format(configmap_name)
        )
    if not isinstance(default_csc, dict):
        raise CommandExecutionError(
            'Expected default CSC for ConfigMap {} but got {}'.format(
                configmap_name, default_csc
            )
        )

    try:
        manifest = __salt__[
            'metalk8s_kubernetes.get_object'
        ](
            kind='ConfigMap',
            apiVersion='v1',
            namespace=namespace,
            name=configmap_name
        )
    except ValueError as exc:
        raise CommandExecutionError(
            'Failed to read ConfigMap object {}'.format(configmap_name)
        ) from exc

    if manifest is None:
        raise CommandExecutionError(
            'Expected ConfigMap object but got {}'.format(manifest)
        )

    try:
        conf_section = manifest.get('data', {}).get('config.yaml', {})
        config = yaml.safe_load(conf_section) or {}
    except yaml.YAMLError as exc:
        raise CommandExecutionError(
            'Invalid YAML format in ConfigMap {}'.format(configmap_name)
        ) from exc
    except Exception as exc:
        raise CommandExecutionError(
            'Failed loading `config.yaml` from ConfigMap {}'.format(
                configmap_name
            )
        ) from exc
    if not config:
        raise CommandExecutionError(
            'Expected `config.yaml` as yaml in the ConfigMap {} but got {}'
            .format(configmap_name, config)
        )
    if apiVersion and config['apiVersion'] != apiVersion:
        raise CommandExecutionError(
            'Expected value {} for key apiVersion, got {}'.format(
                apiVersion, config['apiVersion']
            )
        )
    if kind and config['kind'] != kind:
        raise CommandExecutionError(
            'Expected value {} for key kind, got {}'.format(
                kind, config['kind']
            )
        )
    merged_config = salt.utils.dictupdate.merge(
        default_csc, config, strategy='recurse',
        merge_lists=True
    )

    return merged_config
