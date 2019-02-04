import logging

log = logging.getLogger(__name__)

__virtualname__ = 'certificate_ttl'

def __virtual__():
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

    result = __salt__['x509.will_expire'](certificate=path, days=ttl)

    if result['will_expire']:
        log.warning('Certificate %r will expire within %d days', path, ttl)

        return {
            'kind': 'plain',
            'path': path,
            'tag': path,
            'data': result,
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
