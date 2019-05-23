'''
Various functions to interact with :program:`containerd` using :command:`ctr`.
'''

import logging

log = logging.getLogger(__name__)


__virtualname__ = 'containerd'


def __virtual__():
    return __virtualname__


def load_cri_image(path):
    '''
    Load a Docker image archive into the :program:`containerd` CRI image cache.

    .. note::

       This uses the :command:`ctr` command.

    path
        Path of the Docker image archive to load
    '''
    log.info('Importing image from "%s" into CRI cache', path)
    return __salt__['cmd.run_all'](
        'ctr -n k8s.io image import "{0}"'.format(path)
    )
