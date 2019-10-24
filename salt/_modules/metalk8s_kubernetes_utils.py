"""Utility methods for interacting with Kubernetes API server.

This module is merged into the `metalk8s_kubernetes` execution module,
by virtue of its `__virtualname__`.
"""
from __future__ import absolute_import

from salt.exceptions import CommandExecutionError


MISSING_DEPS = []
try:
    import kubernetes.client
    from kubernetes.client.rest import ApiException
except ImportError:
    MISSING_DEPS.append('kubernetes.client')

try:
    import kubernetes.config
except ImportError:
    MISSING_DEPS.append('kubernetes.config')

try:
    from urllib3.exceptions import HTTPError
except ImportError:
    MISSING_DEPS.append('urllib3')


__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    if MISSING_DEPS:
        return False, 'Missing dependencies: {}'.format(
            ', '.join(MISSING_DEPS)
        )

    return __virtualname__


def get_version_info(kubeconfig=None, context=None):
    """Retrieve the API server version information, as a dict.

    The result contains various version details to be as exhaustive as
    possible.

    CLI Example:
        salt '*' metalk8s_kubernetes.get_version_info
    """
    api_client = kubernetes.config.new_client_from_config(
        config_file=kubeconfig, context=context
    )

    api_instance = kubernetes.client.VersionApi(api_client=api_client)

    try:
        version_info = api_instance.get_code()
    except (ApiException, HTTPError) as exc:
        raise CommandExecutionError(
            'Failed to get version info: {}'.format(str(exc))
        )

    return version_info.to_dict()


def ping(kubeconfig=None, context=None):
    """Check connection with the API server.

    Returns True if a request could be made, False otherwise.

    CLI Example:
        salt '*' metalk8s_kubernetes.ping
    """
    try:
        get_version_info(kubeconfig, context)
    except CommandExecutionError:
        return False
    return True
