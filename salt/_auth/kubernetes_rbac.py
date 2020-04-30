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


@_log_exceptions
def _auth_basic(kubeconfig, username, token):
    decoded = base64.decodestring(token)
    if ':' not in decoded:
        log.warning('Invalid Basic token format: missing ":"')
        return False

    (token_username, _) = decoded.split(':', 1)

    if token_username != username:
        log.warning('Invalid Basic token: username mismatch')
        return False

    # Using the '/version/' endpoint which is unauthenticated by default but,
    # when presented authentication data, will process this information and fail
    # accordingly.
    url = '{}/version/'.format(kubeconfig.host)
    verify = kubeconfig.ssl_ca_cert if kubeconfig.verify_ssl else False
    try:
        response = requests.get(
            url,
            headers={
                'Authorization': 'Basic {}'.format(token),
            },
            verify=verify,
        )

        if 200 <= response.status_code < 300:
            return True
        else:
            return False
    except:
        log.exception('Error during request')
        raise

    return False


@_log_exceptions
def _groups_basic(kubeconfig, username, token):
    kubeconfig.api_key = {
        'authorization': token,
    }
    kubeconfig.api_key_prefix = {
        'authorization': 'Basic',
    }
    kubeconfig.username = username
    kubeconfig.password = None
    kubeconfig.cert_file = None
    kubeconfig.key_file = None

    client = kubernetes.client.ApiClient(configuration=kubeconfig)

    authz_api = kubernetes.client.AuthorizationV1Api(api_client=client)

    groups = set()

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

    if result.status.allowed:
        groups.add('node-admins')

    return list(groups)


AUTH_HANDLERS['basic'] = {
    'auth': _auth_basic,
    'groups': _groups_basic,
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


def auth(username, password=None, token=None, **kwargs):
    log.info('Authentication request for "%s"', username)

    if token and password:
        log.warning(
            'Invalid authentication request cannot provide "token" and '
            '"password" at the same time'
        )
        return False
    if not token and (not password or not username):
        log.warning(
            'Invalid authentication request need a "token" or '
            'a "username" and "password"'
        )
        return False

    # Token authentication request not supported yet
    if token:
        log.warning('Authentication request with "token" is not supported yet')
        return False

    handler = AUTH_HANDLERS['basic']

    kubeconfig = _load_kubeconfig(__opts__)
    if kubeconfig is None:
        log.info('Failed to load Kubernetes API client configuration')
        return False

    result = handler.get('auth', lambda _c, _u, _t: False)(
        kubeconfig,
        username,
        token or password
    )
    if result:
        log.info('Authentication request for "%s" succeeded', username)
    else:
        log.warning('Authentication request for "%s" failed', username)

    return result


def groups(username, password=None, token=None, **kwargs):
    log.info('Groups request for "%s"', username)

    if token and password:
        log.warning(
            'Invalid groups request cannot provide "token" and "password" '
            'at the same time'
        )
        return []
    if not token and (not password or not username):
        log.warning(
            'Invalid groups request need a "token" or '
            'a "username" and "password"'
        )
        return []

    # Token groups requests not supported yet
    if token:
        log.warning('Groups request with "token" is not supported yet')
        return []

    handler = AUTH_HANDLERS['basic']

    kubeconfig = _load_kubeconfig(__opts__)
    if kubeconfig is None:
        log.info('Failed to load Kubernetes API client configuration')
        return []

    result = handler.get('groups', lambda _c, _u, _t: [])(
        kubeconfig,
        username,
        token or password
    )
    log.debug('Groups for "%s": %r', username, result)

    return result
