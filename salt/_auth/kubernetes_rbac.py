from functools import wraps
import logging

from salt.exceptions import CommandExecutionError

MISSING_DEPS = []

try:
    import kubernetes.client
    import kubernetes.config
except ImportError:
    MISSING_DEPS.append("kubernetes")

try:
    import requests  # pylint: disable=unused-import
except ImportError:
    MISSING_DEPS.append("requests")


log = logging.getLogger(__name__)

__virtualname__ = "kubernetes_rbac"


def __virtual__():
    if MISSING_DEPS:
        return False, f"Missing Python dependencies: {', '.join(MISSING_DEPS)}"
    else:
        return __virtualname__


AUTH_HANDLERS = {}


def _log_exceptions(f):
    def wrapped(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except:
            log.exception("Exception thrown")
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
            log.error("Invalid authentication request: %s", error)
            raise CommandExecutionError(f"Invalid authentication request: {error}")

        return f(username, token=token, **kwargs)

    return wrapped


def _patch_kubeconfig(kubeconfig, username, token):
    kubeconfig.api_key = {
        "authorization": token,
    }
    kubeconfig.api_key_prefix = {
        "authorization": "Bearer",
    }
    kubeconfig.username = username
    kubeconfig.cert_file = None
    kubeconfig.key_file = None


def _review_access(kubeconfig, resource, verb):
    client = kubernetes.client.ApiClient(configuration=kubeconfig)
    authz_api = kubernetes.client.AuthorizationV1Api(api_client=client)

    # NOTE: any authenticated user can use this API.
    # This comes from the fact that an authenticated user will always belong to
    # the `system:authenticated` group, and this group is bound to the
    # `system:basic-user` ClusterRole, which enables creating
    # SelfSubjectAccessReviews and SelfSubjectRulesReviews.
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


def _review_token(kubeconfig, username, token):
    """Check the provided bearer token using the TokenReview API."""
    client = kubernetes.client.ApiClient(configuration=kubeconfig)
    authn_api = kubernetes.client.AuthenticationV1Api(api_client=client)

    token_review = authn_api.create_token_review(
        body=kubernetes.client.V1TokenReview(
            spec=kubernetes.client.V1TokenReviewSpec(token=token)
        )
    )

    if token_review.status.error:
        log.error(
            "Failed to create TokenReview for '%s': %s",
            username,
            token_review.status.error,
        )
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


def _check_node_admin(kubeconfig):
    return _review_access(kubeconfig, "nodes", "*").status.allowed


AVAILABLES_GROUPS = {"node-admins": _check_node_admin}


def _get_groups(kubeconfig, username, token):
    _patch_kubeconfig(kubeconfig, username, token)

    groups = set()

    for group, func in AVAILABLES_GROUPS.items():
        if func(kubeconfig):
            groups.add(group)

    return list(groups)


@_log_exceptions
def _load_kubeconfig(opts):
    config = {
        "kubeconfig": None,
        "context": None,
    }

    for opt in opts["external_auth"][__virtualname__]:
        if opt.startswith("^"):
            config[opt[1:]] = opts["external_auth"][__virtualname__][opt]

    if config["kubeconfig"] is None:
        log.error("Missing configuration: kubeconfig")
        return None

    kubeconfig = kubernetes.client.Configuration()
    kubernetes.config.load_kube_config(
        config_file=config["kubeconfig"],
        context=config["context"],
        client_configuration=kubeconfig,
        persist_config=False,
    )

    return kubeconfig


@_check_auth_args
def auth(username, token=None, **_kwargs):
    log.info('Authentication request for "%s"', username)

    kubeconfig = _load_kubeconfig(__opts__)
    if kubeconfig is None:
        log.info("Failed to load Kubernetes API client configuration")
        return False

    result = _review_token(kubeconfig, username, token)
    if result:
        log.info('Authentication request for "%s" succeeded', username)
    else:
        log.warning('Authentication request for "%s" failed', username)

    return result


@_check_auth_args
def groups(
    username, password=None, token=None, **_kwargs
):  # pylint: disable=unused-argument
    log.info('Groups request for "%s"', username)

    kubeconfig = _load_kubeconfig(__opts__)
    if kubeconfig is None:
        log.info("Failed to load Kubernetes API client configuration")
        return []

    result = _get_groups(kubeconfig, username, token)
    log.debug('Groups for "%s": %s', username, ", ".join(result))
    return result
