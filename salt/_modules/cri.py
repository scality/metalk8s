'''
Various functions to interact with a CRI daemon (through :program:`crictl`).
'''

import re
import logging

import salt.utils.json


log = logging.getLogger(__name__)


__virtualname__ = 'cri'


def __virtual__():
    log.debug("Looking for 'crictl'")
    if not salt.utils.path.which('crictl'):
        return (False, "'crictl' command not found")

    log.debug("Validating CRI connection / 'crictl' configuration")
    # `ignore_retcode`, otherwise logs gets spammed for no good reason
    result = __salt__['cmd.run_all'](
        'crictl -t 250ms version', timeout=1, ignore_retcode=True)
    if result['retcode'] != 0:
        return (False, "'crictl' can't connect to CRI daemon")

    return __virtualname__


def list_images():
    '''
    List the images stored in the CRI image cache.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    '''
    log.info('Listing CRI images')
    out = __salt__['cmd.run_all']('crictl images -o json')
    if out['retcode'] != 0:
        log.error('Failed to list images')
        return None

    return salt.utils.json.loads(out['stdout'])['images']


_PULL_RES = {
    'sha256': re.compile(
        r'Image is up to date for sha256:(?P<digest>[a-fA-F0-9]{64})'),
}


def pull_image(image):
    '''
    Pull an image into the CRI image cache.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    image
        Tag or digest of the image to pull
    '''
    log.info('Pulling CRI image "%s"', image)
    out = __salt__['cmd.run_all']('crictl pull "{0}"'.format(image))

    if out['retcode'] != 0:
        log.error('Failed to pull image "%s"', image)
        return None

    log.info('CRI image "%s" pulled', image)
    stdout = out['stdout']

    ret = {
        'digests': {},
    }

    for (digest, regex) in _PULL_RES.items():
        re_match = regex.match(stdout)
        if re_match:
            ret['digests'][digest] = re_match.group('digest')

    return ret
