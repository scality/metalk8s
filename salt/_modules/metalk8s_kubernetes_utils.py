"""Utility methods for interacting with Kubernetes API server.

This module is merged into the `metalk8s_kubernetes` execution module,
by virtue of its `__virtualname__`.
"""
from __future__ import absolute_import

from salt.exceptions import CommandExecutionError
import salt.utils.files
import salt.utils.templates
import salt.utils.yaml

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


def read_and_render_yaml_file(source, template, context=None, saltenv='base'):
    '''
    Read a yaml file and, if needed, renders that using the specifieds
    templating. Returns the python objects defined inside of the file.
    '''
    sfn = __salt__['cp.cache_file'](source, saltenv)
    if not sfn:
        raise CommandExecutionError(
            'Source file \'{0}\' not found'.format(source))

    if not context:
        context = {}

    with salt.utils.files.fopen(sfn, 'r') as src:
        contents = src.read()

        if template:
            if template in salt.utils.templates.TEMPLATE_REGISTRY:
                data = salt.utils.templates.TEMPLATE_REGISTRY[template](
                    contents,
                    from_str=True,
                    to_str=True,
                    context=context,
                    saltenv=saltenv,
                    grains=__grains__,
                    pillar=__pillar__,
                    salt=__salt__,
                    opts=__opts__)

                if not data['result']:
                    # Failed to render the template
                    raise CommandExecutionError(
                        'Failed to render file path with error: '
                        '{0}'.format(data['data'])
                    )

                contents = data['data'].encode('utf-8')
            else:
                raise CommandExecutionError(
                    'Unknown template specified: {0}'.format(
                        template))

        return salt.utils.yaml.safe_load(contents)
