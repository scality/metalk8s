'''Metalk8s cluster and service configuration utility.'''

import logging
import yaml

from salt.exceptions import CommandExecutionError


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_service_configuration'


def __virtual__():
    return __virtualname__


def get_service_conf(
    namespace,
    configmap_name,
    apiVersion=None,
    kind=None,
    **kwargs
):
    """Reads a ConfigMap from the name specified

    Arguments:
        configmap_name: the ConfigMap name
        namespace: the Namespace where the ConfigMap is stored

    Returns:
        A dict of a specific service configuration

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_service_configuration.get_service_conf "metalk8s-monitoring" "metalk8s-prometheus-config"
    """

    if not configmap_name:
        raise Exception(
            'Expected a ConfigMap name but got {}'.format(configmap_name)
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
            'Failed to read ConfigMap object {}: {!s}'
            .format(configmap_name, exc)
        )

    if manifest is None:
        raise CommandExecutionError(
            'Expected ConfigMap object but got {}'.format(manifest)
        )

    try:
        conf_section = manifest.get('data', {}).get('config.yaml', {})
        config = yaml.safe_load(conf_section) or {}
    except yaml.YAMLError as exc:
        raise CommandExecutionError(
            'Invalid YAML format in ConfigMap {}: {!s}'.format(
                configmap_name, exc
            )
        )
    except Exception as exc:
        raise CommandExecutionError(
            'Failed loading `config.yaml` from ConfigMap {}: {!s}'.format(
                configmap_name, exc
            )
        )
    if not config:
        raise CommandExecutionError(
            'Expected `config.yaml` as yaml in the ConfigMap {} but got {}'
            .format(configmap_name, config)
        )

    if not apiVersion and not kind:
        return config

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

    #Todo: Need a full schema validation of the ConfigMap data portion
    return config
