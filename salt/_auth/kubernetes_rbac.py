import base64
import logging

MISSING_DEPS = []

try:
    import kubernetes.client
    import kubernetes.config
except ImportError:
    MISSING_DEPS.append('kubernetes')

try:
    import requests
except ImportError:
    MISSING_DEPS.append('requests')


log = logging.getLogger(__name__)

__virtualname__ = 'kubernetes_rbac'

def __virtual__():
    if MISSING_DEPS:
        return False, 'Missing Python dependencies: {}'.format(
            ', '.join(MISSING_DEPS))
    else:
        return __virtualname__


AUTH_HANDLERS = {}


def _log_exceptions(f):
    def wrapped(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except:
            log.exception('Exception thrown')
            raise

    return wrapped


def _check_k8s_creds(kubeconfig, token):
    """Check the provided credentials against /version."""
    # Using the '/version/' endpoint which is unauthenticated by default but,
    # when presented authentication data, will process this information and fail
    # accordingly.
    url = '{}/version/'.format(kubeconfig.host)
    verify = kubeconfig.ssl_ca_cert if kubeconfig.verify_ssl else False
    try:
        response = requests.get(
            url, headers={'Authorization': token}, verify=verify
        )
        return 200 <= response.status_code < 300
    except:
        log.exception('Error during request')
        raise


def _check_node_admin(kubeconfig):
    client = kubernetes.client.ApiClient(configuration=kubeconfig)

    authz_api = kubernetes.client.AuthorizationV1Api(api_client=client)

    result = authz_api.create_self_subject_access_review(
        body=kubernetes.client.V1SelfSubjectAccessReview(
            spec=kubernetes.client.V1SelfSubjectAccessReviewSpec(
                resource_attributes=kubernetes.client.V1ResourceAttributes(
                    resource='nodes',
                    verb='*',
                ),
            ),
        ),
    )

    return result.status.allowed


AVAILABLES_GROUPS = {
    'node-admins': _check_node_admin
}


def _get_groups(kubeconfig):
    groups = set()

    for group, func in AVAILABLES_GROUPS.items():
        if func(kubeconfig):
            groups.add(group)

    return list(groups)


@_log_exceptions
def _auth_bearer(kubeconfig, username, token):
    return _check_k8s_creds(kubeconfig, 'Bearer {}'.format(token))


@_log_exceptions
def _groups_bearer(kubeconfig, _username, token):
    kubeconfig.api_key = {
        'authorization': token,
    }
    kubeconfig.api_key_prefix = {
        'authorization': 'Bearer',
    }
    kubeconfig.username = None
    kubeconfig.password = None
    kubeconfig.cert_file = None
    kubeconfig.key_file = None

    return _get_groups(kubeconfig)


AUTH_HANDLERS['bearer'] = {
    'auth': _auth_bearer,
    'groups': _groups_bearer
}


@_log_exceptions
def _load_kubeconfig(opts):
    config = {
        'kubeconfig': None,
        'context': None,
    }

    for opt in opts['external_auth'][__virtualname__]:
        if opt.startswith('^'):
            config[opt[1:]] = opts['external_auth'][__virtualname__][opt]

    if config['kubeconfig'] is None:
        log.error('Missing configuration: kubeconfig')
        return None

    kubeconfig = kubernetes.client.Configuration()
    kubernetes.config.load_kube_config(
        config_file=config['kubeconfig'],
        context=config['context'],
        client_configuration=kubeconfig,
        persist_config=False,
    )

    return kubeconfig


def auth(username, token, token_type, **kwargs):
    log.info('Authentication request for "%s"', username)

    handler = AUTH_HANDLERS.get(token_type.lower(), None)
    if not handler:
        log.warning('Unknown auth token_type: %s', token_type)
        return False

    kubeconfig = _load_kubeconfig(__opts__)
    if kubeconfig is None:
        log.info('Failed to load Kubernetes API client configuration')
        return False

    result = handler.get('auth', lambda _c, _u, _t: False)(kubeconfig, username, token)
    if result:
        log.info('Authentication request for "%s" succeeded', username)
    else:
        log.warning('Authentication request for "%s" failed', username)

    return result


def groups(username, token, token_type, **kwargs):
    log.info('Groups request for "%s"', username)

    handler = AUTH_HANDLERS.get(token_type.lower(), None)
    if not handler:
        log.debug('Unknown groups token_type: %s', token_type)
        return []

    kubeconfig = _load_kubeconfig(__opts__)
    if kubeconfig is None:
        log.info('Failed to load Kubernetes API client configuration')
        return []

    result = handler.get('groups', lambda _c, _u, _t: [])(kubeconfig, username, token)
    log.debug('Groups for "%s": %r', username, result)

    return result
