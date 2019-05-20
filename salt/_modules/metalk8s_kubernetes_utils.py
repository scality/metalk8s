'''
Utility module for Kubernetes API connection management.

This module's functions are merged into the `metalk8s_kubernetes`
module when called by salt by virtue of its `__virtualname__` attribute.
'''

from __future__ import absolute_import, unicode_literals, print_function
import base64
import errno
import logging
import os
import tempfile

from salt.exceptions import CommandExecutionError
from salt.ext.six import iteritems
from salt.ext import six
import salt.utils.files
import salt.utils.platform
import salt.utils.templates
import salt.utils.versions
import salt.utils.yaml
from salt.exceptions import TimeoutError
from salt.ext.six.moves import range  # pylint: disable=import-error


try:
    import kubernetes
    import kubernetes.client

    HAS_LIBS = True
except ImportError:
    HAS_LIBS = False


log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    '''
    Check dependencies
    '''
    if HAS_LIBS:
        return __virtualname__

    return False, 'python kubernetes library not found'


def setup_conn_old(**kwargs):
    '''
    Setup kubernetes API connection singleton the old way
    '''
    host = __salt__['config.option']('kubernetes.api_url',
                                     'http://localhost:8080')
    username = __salt__['config.option']('kubernetes.user')
    password = __salt__['config.option']('kubernetes.password')
    ca_cert = __salt__['config.option']('kubernetes.certificate-authority-data')
    client_cert = __salt__['config.option']('kubernetes.client-certificate-data')
    client_key = __salt__['config.option']('kubernetes.client-key-data')
    ca_cert_file = __salt__['config.option']('kubernetes.certificate-authority-file')
    client_cert_file = __salt__['config.option']('kubernetes.client-certificate-file')
    client_key_file = __salt__['config.option']('kubernetes.client-key-file')

    # Override default API settings when settings are provided
    if 'api_url' in kwargs:
        host = kwargs.get('api_url')

    if 'api_user' in kwargs:
        username = kwargs.get('api_user')

    if 'api_password' in kwargs:
        password = kwargs.get('api_password')

    if 'api_certificate_authority_file' in kwargs:
        ca_cert_file = kwargs.get('api_certificate_authority_file')

    if 'api_client_certificate_file' in kwargs:
        client_cert_file = kwargs.get('api_client_certificate_file')

    if 'api_client_key_file' in kwargs:
        client_key_file = kwargs.get('api_client_key_file')

    if (
            kubernetes.client.configuration.host != host or
            kubernetes.client.configuration.user != username or
            kubernetes.client.configuration.password != password):
        # Recreates API connection if settings are changed
        kubernetes.client.configuration.__init__()

    kubernetes.client.configuration.host = host
    kubernetes.client.configuration.user = username
    kubernetes.client.configuration.passwd = password

    if ca_cert_file:
        kubernetes.client.configuration.ssl_ca_cert = ca_cert_file
    elif ca_cert:
        with tempfile.NamedTemporaryFile(prefix='salt-kube-', delete=False) as ca:
            ca.write(base64.b64decode(ca_cert))
            kubernetes.client.configuration.ssl_ca_cert = ca.name
    else:
        kubernetes.client.configuration.ssl_ca_cert = None

    if client_cert_file:
        kubernetes.client.configuration.cert_file = client_cert_file
    elif client_cert:
        with tempfile.NamedTemporaryFile(prefix='salt-kube-', delete=False) as c:
            c.write(base64.b64decode(client_cert))
            kubernetes.client.configuration.cert_file = c.name
    else:
        kubernetes.client.configuration.cert_file = None

    if client_key_file:
        kubernetes.client.configuration.key_file = client_key_file
    elif client_key:
        with tempfile.NamedTemporaryFile(prefix='salt-kube-', delete=False) as k:
            k.write(base64.b64decode(client_key))
            kubernetes.client.configuration.key_file = k.name
    else:
        kubernetes.client.configuration.key_file = None
    return {}

# pylint: disable=no-member
def setup_conn(**kwargs):
    '''
    Setup kubernetes API connection singleton
    '''
    kubeconfig = kwargs.get('kubeconfig') or __salt__['config.option']('kubernetes.kubeconfig')
    kubeconfig_data = kwargs.get('kubeconfig_data') or __salt__['config.option']('kubernetes.kubeconfig-data')
    context = kwargs.get('context') or __salt__['config.option']('kubernetes.context') or None

    if (kubeconfig_data and not kubeconfig) or (kubeconfig_data and kwargs.get('kubeconfig_data')):
        with tempfile.NamedTemporaryFile(prefix='salt-kubeconfig-', delete=False) as kcfg:
            kcfg.write(base64.b64decode(kubeconfig_data))
            kubeconfig = kcfg.name

    if not kubeconfig:
        if kwargs.get('api_url') or __salt__['config.option']('kubernetes.api_url'):
            salt.utils.versions.warn_until('Sodium',
                    'Kubernetes configuration via url, certificate, username and password will be removed in Sodiom. '
                    'Use \'kubeconfig\' and \'context\' instead.')
            try:
                return setup_conn_old(**kwargs)
            except Exception:
                raise CommandExecutionError('Old style kubernetes configuration is only supported up to python-kubernetes 2.0.0')
        else:
            raise CommandExecutionError('Invalid kubernetes configuration. Parameter \'kubeconfig\' is required.')
    kubernetes.config.load_kube_config(config_file=kubeconfig, context=context)

    # The return makes unit testing easier
    return {'kubeconfig': kubeconfig, 'context': context}


def cleanup_old(**kwargs):
    try:
        ca = kubernetes.client.configuration.ssl_ca_cert
        cert = kubernetes.client.configuration.cert_file
        key = kubernetes.client.configuration.key_file
        if cert and os.path.exists(cert) and os.path.basename(cert).startswith('salt-kube-'):
            salt.utils.files.safe_rm(cert)
        if key and os.path.exists(key) and os.path.basename(key).startswith('salt-kube-'):
            salt.utils.files.safe_rm(key)
        if ca and os.path.exists(ca) and os.path.basename(ca).startswith('salt-kube-'):
            salt.utils.files.safe_rm(ca)
    except Exception:
        pass


def cleanup(**kwargs):
    if not kwargs:
        return cleanup_old(**kwargs)

    if 'kubeconfig' in kwargs:
        kubeconfig = kwargs.get('kubeconfig')
        if kubeconfig and os.path.basename(kubeconfig).startswith('salt-kubeconfig-'):
            try:
                os.unlink(kubeconfig)
            except (IOError, OSError) as err:
                if err.errno != errno.ENOENT:
                    log.exception(err)

