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
    return [
        'node_admin',
    ]

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
