# -*- coding: utf-8 -*-

from base64 import b64encode

__virtualname__ = 'metalk8s_kubeconfig'


def __virtual__():
    return __virtualname__


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
    if __salt__['metalk8s_kubeconfig.validate'](
            name, b64_ca_cert, apiserver, user):
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
