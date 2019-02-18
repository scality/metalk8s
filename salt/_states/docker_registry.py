'''
States to manage images in a Docker registry.
'''

import logging

import salt.exceptions

log = logging.getLogger(__name__)


__virtualname__ = 'docker_registry'


def __virtual__():
    if 'docker_registry.get_image_manifest' not in __salt__:
        return (False, "Missing 'docker_registry' module")

    return __virtualname__


def image_managed(name, archive_path=None, digest=None, force=False,
        tls_verify=True):
    '''
    Push an image to a Docker repository.

    name
        Name of the image (including repository), e.g.,
        `localhost:5000/metalk8s/nginx:1.14.2`.
    archive_path : None
        Path of the Docker archive to upload, if image not available.
    digest : None
        Expected digest of the image. If no match and `force` is `False`, the
        state will fail.
    force : False
        Force-push the image on digest mismatch, or if no digest is provided.
    tls_verify : True
        Verify TLS certificates when retrieving image metadata, passed to
        `docker_registry.get_image_manifest` and
        `docker_registry.push_docker_archive` (as `dest_tls_verify`).
    '''
    ret = {
        'name': name,
        'result': False,
        'changes': {},
        'pchange': {},
        'comment': '',
    }

    image_manifest = __salt__['docker_registry.get_image_manifest'](
        name, tls_verify=tls_verify)

    if not archive_path:
        if not image_manifest:
            ret['comment'] = 'Image not found'
            ret['result'] = False
        elif digest is None:
            ret['comment'] = 'Image found'
            ret['result'] = True
        else:
            if image_manifest['Digest'] == digest:
                ret['comment'] = 'Image up-to-date'
                ret['result'] = True
            else:
                ret['comment'] = 'Image digest conflict'
                ret['result'] = False

        return ret


    if image_manifest is not None and digest is not None:
        digest_match = image_manifest['Digest'] == digest

        if digest_match:
            ret['comment'] = 'Image up-to-date'
            ret['result'] = True
            return ret
        elif not digest_match and not force:
            ret['comment'] = 'Image digest conflict'
            ret['result'] = False
            return ret
        elif not digest_match and force:
            if __opts__['test']:
                ret['comment'] = 'Will force-push archive'
                ret['result'] = None
                ret['pchanges'].update({
                    name: {
                        'old': {
                            'name': name,
                            'digest': image_manifest['Digest'],
                        },
                        'new': {
                            'name': name,
                            'digest': digest,
                        },
                    },
                })
                return ret
            else:
                result = __salt__['docker_registry.push_docker_archive'](
                    archive_path=archive_path,
                    destination=name,
                    dest_tls_verify=tls_verify)

                if result:
                    ret['comment'] = 'Force-pushed archive'
                    ret['result'] = True
                    ret['changes'].update({
                        name: {
                            'old': {
                                'digest': image_manifest['Digest'],
                            },
                            'new': {
                                'digest': digest,
                            },
                        },
                    })
                else:
                    ret['comment'] = 'Failed to push image'
                    ret['result'] = False

                return ret
        else:
            assert False, 'Logic error'
    elif image_manifest is not None and digest is None:
        if not force:
            ret['comment'] = 'Image exists'
            ret['result'] = True
        else:
            if __opts__['test']:
                ret['comment'] = 'Would force-push image'
                ret['result'] = None
                ret['pchanges'].update({
                    name: {
                        'old': {
                            'digest': image_manifest['Digest'],
                        },
                        'new': {
                            'digest': digest,
                        },
                    },
                })
            else:
                result = __salt__['docker_registry.push_docker_archive'](
                    archive_path=archive_path,
                    destination=name,
                    dest_tls_verify=tls_verify)
                if result:
                    ret['comment'] = 'Force-pushed image'
                    ret['result'] = True
                    ret['changes'].update({
                        name: {
                            'old': {
                                'digest': image_manifest['Digest'],
                            },
                            'new': {
                                'digest': digest,
                            },
                        },
                    })
                else:
                    ret['comment'] = 'Failed to push image'
                    ret['result'] = False

        return ret
    elif image_manifest is None:
        if __opts__['test']:
            ret['comment'] = 'Would push image'
            ret['result'] = None
            ret['pchanges'].update({
                name: {
                    'old': {},
                    'new': {
                        'digest': digest,
                    },
                },
            })
            return ret

        result = __salt__['docker_registry.push_docker_archive'](
            archive_path=archive_path,
            destination=name,
            dest_tls_verify=tls_verify)

        if result:
            ret['comment'] = 'Pushed image'
            ret['changes'].update({
                name: {
                    'old': {},
                    'new': {
                        'digest': digest,
                    },
                },
            })
            ret['result'] = True
        else:
            ret['comment'] = 'Failed to push image'
            ret['result'] = False

        return ret
    else:
        assert False, 'Logic error'
