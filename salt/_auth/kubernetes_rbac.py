import base64
import logging

log = logging.getLogger(__name__)

__virtualname__ = 'kubernetes_rbac'

def __virtual__():
    return __virtualname__


ADMIN_USERNAME = b'admin'
ADMIN_PASSWORD = b'admin'
ADMIN_TOKEN = base64.encodestring(
    b'{}:{}'.format(ADMIN_USERNAME, ADMIN_PASSWORD)).rstrip()
AUTH_HANDLERS = {
    'basic': {
        'auth': lambda username, token: all([
            username == ADMIN_USERNAME,
            token == ADMIN_TOKEN,
        ]),
        'groups': lambda _u, _t: [
            'node_admin',
        ],
    },
}


def auth(username, token, token_type, **kwargs):
    log.info('Authentication request for "%s"', username)

    handler = AUTH_HANDLERS.get(token_type.lower(), None)
    if not handler:
        log.warning('Unknown auth token_type: %s', token_type)
        return False

    result = handler.get('auth', lambda _u, _t: False)(username, token)
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

    result = handler.get('groups', lambda _u, _t: [])(username, token)
    log.debug('Groups for "%s": %r', username, result)

    return result
