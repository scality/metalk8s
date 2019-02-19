'''
Functions to interact with a Docker registry.
'''

import logging

import salt.utils.json
import salt.utils.path

log = logging.getLogger(__name__)


__virtualname__ = 'docker_registry'


def __virtual__():
    return __virtualname__


def get_image_manifest(image, tls_verify=True):
    '''
    Retrieve an image manifest from a repository.

    .. note::

       This uses the :command:`skopeo` command.

    image
        Name of the image (e.g. `localhost:5000/metalk8s/nginx:1.14.2`)
    tls_verify : True
        Verify TLS certificate of the repository. Set to `False` if the
        repository uses HTTP instead of HTTPS.
    '''
    log.info('Retrieving image manifest for "%s"', image)

    cmd = ['skopeo', 'inspect']

    cmd.append('--tls-verify={0}'.format('true' if tls_verify else 'false'))

    cmd.append('docker://{0}'.format(image))

    out = __salt__['cmd.run_all'](' '.join(cmd), ignore_retcode=True)

    if out['retcode'] != 0:
        log.info('Failed to retrieve image manifest')

        if 'manifest unknown' in out['stderr']:
            return None
        else:
            raise salt.exceptions.CommandExecutionError(
                'Failure while retrieving image manifest: {0}'.format(
                    out['stderr']))

    return salt.utils.json.loads(out['stdout'])


def push_docker_archive(archive_path, destination, dest_tls_verify=True):
    '''
    Push a Docker image archive to a repository.

    .. note::

       This uses the :command:`skopeo` command.

    archive_path
        Path of the Docker image archive to push
    destination
        Image destination, e.g. `localhost:5000/metalk8s/nginx:1.14.2`
    dest_tls_verify : True
        Verify TLS certificate of the repository. Set to `False` if the
        repository uses HTTP instead of HTTPS.
    '''
    log.info('Pushing archive "%s" to "%s"', archive_path, destination)

    cmd = ['skopeo', 'copy']
    cmd.append(
        '--dest-tls-verify={0}'.format('true' if dest_tls_verify else 'false')
    )

    cmd.append('docker-archive:{0}'.format(archive_path))
    cmd.append('docker://{0}'.format(destination))

    out = __salt__['cmd.run_all'](' '.join(cmd))

    return out['retcode'] == 0
