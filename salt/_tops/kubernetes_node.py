import logging

__virtualname__ = 'kubernetes'

HAS_DEPS = True

log = logging.getLogger(__name__)

def __virtual__():
    if HAS_DEPS:
        return __virtualname__
    else:
        return False


def top(**kwargs):
    log.debug('Calling top')
    return {
        'base': ['foo'],
    }
