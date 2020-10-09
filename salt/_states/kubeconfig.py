# -*- coding: utf-8 -*-

from base64 import b64encode, b64decode
from datetime import datetime, timedelta
import os
import stat
import yaml

__virtualname__ = 'metalk8s_kubeconfig'


def __virtual__():
    return __virtualname__


def _validateKubeConfig(filename,
                        expected_ca_data,
                        expected_api_server,
                        expected_cn):
    """Validate a kubeconfig filename.

    Validate that the kubeconfig provided by filename
    is conform with config.

    This function is used for managed idempotency.

    :return: True if the kubeconfig file matches expectation
             False otherwise (ie need to be regenerated)
    """
    # Verify if the file exists
    if not os.path.isfile(filename):
        return False

    # Verify that the mode is 600
    if stat.S_IMODE(os.stat(filename).st_mode) != 0o600:
        return False

    try:
        with open(filename, 'r') as fd:
            kubeconfig = yaml.safe_load(fd)
    except Exception:
        return False

    # Verify that the current CA cert on disk matches the expected CA cert
    # and the API Server on the existing file match with the expected
    try:
        cluster_info = kubeconfig['clusters'][0]['cluster']
        current_ca_data = cluster_info['certificate-authority-data']
        current_api_server = cluster_info['server']
    except (KeyError, IndexError):
        return False

    if current_ca_data != expected_ca_data:
        return False

    if current_api_server != expected_api_server:
        return False

    # Client Key and certificate verification
    try:
        b64_client_key = kubeconfig['users'][0]['user']['client-key-data']
        b64_client_cert = kubeconfig['users'][0][
            'user']['client-certificate-data']
    except (KeyError, IndexError):
        return False

    try:
        client_key = b64decode(b64_client_key).decode()
        client_cert = b64decode(b64_client_cert).decode()
    except TypeError:
        return False

    ca_pem_cert = b64decode(current_ca_data).decode()

    client_cert_detail = __salt__['x509.read_certificate'](client_cert)

    # Verify client cn
    try:
        current_cn = client_cert_detail['Subject']['CN']
    except KeyError:
        return False
    else:
        if current_cn != expected_cn:
            return False

    # Verify client client cert expiration date is > 30days
    try:
        expiration_date = client_cert_detail['Not After']
    except KeyError:
        return False
    else:
        if datetime.strptime(expiration_date, "%Y-%m-%d %H:%M:%S") \
                - timedelta(days=30) < datetime.now():
            return False

    if __salt__['x509.verify_signature'](
            client_cert, ca_pem_cert) is not True:
        return False

    if __salt__['x509.verify_private_key'](
            client_key, client_cert) is not True:
        return False

    return True


def managed(name,
            ca_server,
            signing_policy,
            client_cert_info,
            apiserver,
            cluster,
            **kwargs):
    """Generate kubeconfig file with identities for control plane components"""
    ret = {
        'name': name,
        'changes': {},
        'comment': "",
        'result': True,
    }

    # Get the CA cert from mine
    try:
        b64_ca_cert = __salt__['mine.get'](
            ca_server,
            'kubernetes_root_ca_b64'
        )[ca_server]
    except KeyError:
        ret.update({
            'comment':
                '{0} CA server is not advertized in mine'.format(ca_server),
            'result': False
        })
        return ret
    else:
        b64_ca_cert = b64_ca_cert.replace('\n', '')

    user = client_cert_info.get('CN')

    # Validate if a kubeconfig already exists (idempotency)
    if _validateKubeConfig(name, b64_ca_cert, apiserver, user):
        ret.update({'comment': 'kubeconfig file exists and is up-to-date'})
        return ret

    client_priv_key = __salt__['x509.create_private_key'](
        text=True, verbose=False
    )

    client_cert = __salt__['x509.create_certificate'](
        text=True,
        public_key=client_priv_key,  # pub key is sourced from priv key
        ca_server=ca_server,
        signing_policy=signing_policy,
        **client_cert_info
    )

    dataset = {
        'apiVersion': 'v1',
        'clusters': [
            {
                'cluster': {
                    'certificate-authority-data': b64_ca_cert,
                    'server': apiserver,
                },
                'name': cluster
            }
        ],
        'contexts': [
            {
                'context': {
                    'cluster': cluster,
                    'user': user,
                },
                'name': '{0}@{1}'.format(user, cluster),
            }
        ],
        'current-context': '{0}@{1}'.format(user, cluster),
        'kind': 'Config',
        'preferences': {},
        'users': [
            {
                'name': user,
                'user': {
                    'client-certificate-data': b64encode(client_cert.encode()),
                    'client-key-data': b64encode(client_priv_key.encode())
                }
            }
        ]
    }

    return __states__['file.serialize'](
        name=name,
        dataset=dataset,
        formatter="yaml",
        mode="600",
        makedirs=True
    )
