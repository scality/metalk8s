import logging

log = logging.getLogger(__name__)

import kubernetes.config
import kubernetes.client

import cachetools.func

KUBERNETES_CLIENT = kubernetes.config.new_client_from_config(
	                '/etc/kubernetes/admin.conf')
AUTHN_CLIENT = kubernetes.client.AuthenticationV1Api(
		api_client=KUBERNETES_CLIENT)
AUTHZ_CLIENT = kubernetes.client.AuthorizationV1Api(
		api_client=KUBERNETES_CLIENT)


@cachetools.func.ttl_cache(maxsize=64, ttl=60)
def _token_review(token):
    spec = kubernetes.client.V1TokenReviewSpec(token=token)
    request = kubernetes.client.V1TokenReview(spec=spec)
    return AUTHN_CLIENT.create_token_review(request)


def auth(username, token, **kwargs):
    log.debug('Auth %s', username)
    result = _token_review(token)
    if result.status.authenticated:
        return result.status.user.username == username
    else:
        return False

#@cachetools.func.ttl_cache(maxsize=64, ttl=60)
def _subject_access_review(user, uid, groups, resource_attributes):
    spec = kubernetes.client.V1SubjectAccessReviewSpec(user=user, uid=uid, groups=list(groups), resource_attributes=resource_attributes)
    request = kubernetes.client.V1SubjectAccessReview(spec=spec)
    return AUTHZ_CLIENT.create_subject_access_review(request)

def groups(token, **kwargs):
    log.debug('Groups')
    result = _token_review(token)

    if not result.status.authenticated:
        return []

    try:
        _ = _subject_access_review(result.status.user.username, result.status.user.uid, tuple(result.status.user.groups),
                kubernetes.client.V1ResourceAttributes(name='nodes', verb='create'))
    except Exception:
        log.exception('Oops')
        return []
