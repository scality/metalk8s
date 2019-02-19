'''
Various functions to interact with :program:`containerd` using :command:`ctr`.
'''

import re
import logging

import salt.utils.path

log = logging.getLogger(__name__)


__virtualname__ = 'containerd'


def __virtual__():
    return __virtualname__


_LOAD_RE = re.compile('Loaded image: (?P<name>.*)')


def load_cri_image(path):
    '''
    Load a Docker image archive into the :program:`containerd` CRI image cache.

    .. note::

       This uses the :command:`ctr` command.

    path
        Path of the Docker image archive to load
    '''
    log.info('Importing image from "%s" into CRI cache', path)

    out = __salt__['cmd.run_all']('ctr cri load "{0}"'.format(path))

    if out['retcode'] != 0:
        log.error('Failed to load image archive')
        return None

    stdout = out['stdout']

    ret = {}

    re_match = _LOAD_RE.match(stdout)
    if re_match:
        ret['name'] = re_match.group('name')

    if 'name' in ret:
        log.info(
            'Imported image from "%s" into CRI cache, name is "%s"',
            path, ret['name'])
    else:
        log.info('Imported image from "%s" into CRI cache, name unknown', path)

    return ret
