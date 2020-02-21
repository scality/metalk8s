'''Metalk8s cluster and service configuration utility.'''

import logging
import re

from salt.exceptions import CommandExecutionError

import yaml
from yaml.dumper import SafeDumper
from yaml.representer import SafeRepresenter

log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_service_configurator'


def __virtual__():
    return __virtualname__


def get_service_conf(
    namespace,
    configmap_name,
):
    """Reads  a ConfigMap from the name specified

    Arguments:
        configmap_name: Configmap name
        namespace: the namespace where the configmap is found

    Returns:
        A dict of a specific service configuration

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_service_configurator.service_conf "metalk8s-monitoring" "metalk8s-prometheus-config"
    """

    if configmap_name is None:
        raise Exception(
            'Expected a configmap name but got {}'.format(configmap_name)
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
            'Failed to read Configmap object {} with error {}'
            .format(configmap_name, str(exc))
        )

    if manifest is None:
        raise CommandExecutionError(
            'Expected Configmap object but got {}'.format(manifest)
        )

    try:
        # read the dict object
        # we are only interested in the data section of the configmap for now
        conf_section = manifest.get('data', {}).get('config.yaml', {})
        config = yaml.safe_load(conf_section) or {}
    except Exception as exc:
        raise CommandExecutionError(
            'Failed to get Config section {} as manifest with error {}'
            .format(configmap_name, str(exc))
        )
    if not config:
        raise CommandExecutionError(
            'Expected configmap as yaml but got {}'.format(config)
        )
    return config  # a classic python dict
