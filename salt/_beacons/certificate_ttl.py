from __future__ import print_function

import datetime
import logging

log = logging.getLogger(__name__)

HAS_DEPS = False
try:
    import M2Crypto.X509
    HAS_DEPS = True
except ImportError:
    logging.exception('Failed to load dependencies')

__virtualname__ = 'certificate_ttl'

def __virtual__():
    if not HAS_DEPS:
        return False
    else:
        return __virtualname__

def validate(config):
    log.info('Validating beacon config')

    try:
        for cert in config:
            if 'kind' not in cert:
                raise ValueError('Missing certificate kind')

            if cert['kind'] not in KIND_MAP:
                raise ValueError('Unknown kind: %r', cert)

            # TODO Actually validate
    except (TypeError, ValueError):
        logging.exception('Error during beacon configuration validation')
        return False, 'Beacon configuration validation failed'

    return True, 'Beacon configuration validated'

def check_plain(certificate):
    path = certificate['path']
    # TODO Split certificate extraction, TTL extraction and TTL verification
    ttl = certificate['ttl']

    log.debug('Checking %r has TTL of at least %r', path, ttl)

    cert = M2Crypto.X509.load_cert(path)
    not_after = cert.get_not_after().get_datetime()

    now = datetime.datetime.now(tz=not_after.tzinfo)

    diff = int((not_after - now).total_seconds())

    log.debug('"Not after" of %r is %r, now is %r, diff is %r',
        path, not_after, now, diff)

    if diff < ttl:
        log.warning('Certificate %r has TTL %r, less than required %r',
            path, diff, ttl)

        return {
            'kind': 'plain',
            'path': path,
            'ttl': diff,
            'expired': diff < 0,
            'tag': path,
        }
    else:
        return None

KIND_MAP = {
    'plain': check_plain,
}

def beacon(config):
    log.info('Running beacon')

    results = []

    for certificate in config:
        kind = certificate['kind']

        result = KIND_MAP[kind](certificate)
        if result:
            results.append(result)

    if len(results) != 0:
        log.info('Beacon hit some results')
    else:
        log.debug('Beacon hit no results')

    return results

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)

    if not __virtual__():
        raise Exception('Missing dependencies')

    config = [
        {
            'kind': 'plain',
            'path': '/dev/stdin',
            'ttl': 7 * 24 * 60 * 60,  # One week
        },
    ]

    if not validate(config)[0]:
        raise Exception('Invalid configuration')

    print(beacon(config))
