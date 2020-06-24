import base64
from functools import wraps
import logging

MISSING_DEPS = []

try:
    import kubernetes.client
    import kubernetes.config
    from kubernetes.client.rest import ApiException
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


def _check_auth_args(f):
    @wraps(f)
    def wrapped(username, password=None, token=None, **kwargs):
        error = None

        if password:
            error = 'Basic authentication (using "password") is not supported'
        if not (token and username):
            error = 'must provide both a "token" and a "username"'

        if error is not None:
            log.error('Invalid authentication request: %s', error)
            raise CommandExecutionError(
                'Invalid authentication request: {}'.format(error)
            )

        return f(username, password=password, token=token, **kwargs)

    return wrapped


def _patch_kubeconfig_for_basic(kubeconfig, username, password):
    token = base64.encodestring(':'.join([username, password])).rstrip('\n')
    kubeconfig.api_key = {
        'authorization': token,
    }
    kubeconfig.api_key_prefix = {
        'authorization': 'Basic',
    }
    kubeconfig.username = username
    kubeconfig.cert_file = None
    kubeconfig.key_file = None


def _review_access(kubeconfig, resource, verb):
    client = kubernetes.client.ApiClient(configuration=kubeconfig)
    authz_api = kubernetes.client.AuthorizationV1Api(api_client=client)

    return authz_api.create_self_subject_access_review(
        body=kubernetes.client.V1SelfSubjectAccessReview(
            spec=kubernetes.client.V1SelfSubjectAccessReviewSpec(
                resource_attributes=kubernetes.client.V1ResourceAttributes(
                    resource=resource,
                    verb=verb,
                ),
            ),
        ),
    )


@_log_exceptions
def _auth_basic(kubeconfig, username, password):
    _patch_kubeconfig_for_basic(kubeconfig, username, password)

    try:
        access_review = _review_access(
            kubeconfig, resource='version', verb='get'
        )
    except ApiException as exc:
        if exc.status == 401:
            log.warning("Could not authenticate user '%s'", username)
            return False
        if exc.status == 403:
            log.warning("Authenticated user '%s' cannot GET /version",
                        username)
            return False
        raise

    if access_review.status.evaluation_error:
        log.error('Failed to review access for %s: %s', username,
                  access_review.status.evaluation_error)

    if not access_review.status.allowed:
        log.error('Failed authentication for %s: %s', username,
                  access_review.status.reason)
    return access_review.status.allowed


@_log_exceptions
def _groups_basic(kubeconfig, username, password):
    _patch_kubeconfig_for_basic(kubeconfig, username, password)

    groups = set()

    try:
        result = _review_access(kubeconfig, resource='nodes', verb='*')
    except ApiException as exc:
        if exc.status != 403:
            log.warning("Authenticated user '%s' cannot manage /v1/nodes",
                        username)
        else:
            raise

    if result.status.allowed:
        groups.add('node-admins')

    return list(groups)


def _check_node_admin(kubeconfig):
    return _review_access(kubeconfig, 'nodes', '*').status.allowed


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
    """Check the provided bearer token using the TokenReview API."""
    client = kubernetes.client.ApiClient(configuration=kubeconfig)
    authn_api = kubernetes.client.AuthenticationV1Api(api_client=client)

    token_review = authn_api.create_token_review(
        body=kubernetes.client.V1TokenReview(
            spec=kubernetes.client.V1TokenReviewSpec(token=token)
        )
    )

    if token_review.status.error:
        log.error("Failed to create TokenReview for '%s': %s",
                  username, token_review.status.error)
        return False

    if token_review.status.authenticated:
        if token_review.status.user.username != username:
            log.error(
                "Provided token belongs to '%s', does not match '%s'",
                token_review.status.user.username,
                username,
            )
            return False
        else:
            return True
    else:
        log.error("Provided token for '%s' failed to authenticate", username)
        return False


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


@_check_auth_args
def auth(username, password=None, token=None, **kwargs):
    auth_method = 'basic' if password else 'bearer'
    log.info('Authentication (%s) request for "%s"',
             auth_method.capitalize(), username)

    handler = AUTH_HANDLERS['bearer']

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


@_check_auth_args
def groups(username, password=None, token=None, **kwargs):
    log.info('Groups request for "%s"', username)

    handler = AUTH_HANDLERS['bearer']

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
