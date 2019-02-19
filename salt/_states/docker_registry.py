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


def _image_managed_result(name, result, comment, changes=None, pchanges=None):
    return {
        'name': name,
        'result': result,
        'comment': comment,
        'changes': changes or {},
        'pchanges': pchanges or {},
    }


def _image_managed_changes(name, new_digest, old_digest=None):
    old = {}
    if old_digest:
        old = {
            'digest': old_digest,
        }

    return {
        name: {
            'old': old,
            'new': {
                'digest': new_digest,
            },
        },
    }


def _digest_match(image_manifest, digest):
    return image_manifest['Digest'] == digest


def _image_managed_no_archive(name, image_manifest, digest):
    if not image_manifest:
        return _image_managed_result(name, False, 'Image not found')
    elif digest is None:
        return _image_managed_result(name, True, 'Image found')
    else:
        if _digest_match(image_manifest, digest):
            return _image_managed_result(name, True, 'Image up-to-date')
        else:
            return _image_managed_result(name, False, 'Image digest conflict')


def _image_managed_new_image(name, archive_path, digest, tls_verify):
    if __opts__['test']:
        return _image_managed_result(
            name, None, 'Would push image',
            pchanges=_image_managed_changes(name, digest)
        )
    else:
        result = __salt__['docker_registry.push_docker_archive'](
            archive_path=archive_path,
            destination=name,
            dest_tls_verify=tls_verify)

        if result:
            return _image_managed_result(
                name, True, 'Pushed image',
                changes=_image_managed_changes(name, digest)
            )
        else:
            return _image_managed_result(name, False, 'Failed to push image')


def image_managed(
        name, archive_path=None, digest=None, force=False, tls_verify=True):
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
        return _image_managed_no_archive(name, image_manifest, digest)

    if image_manifest is not None and digest is not None:
        digest_match = image_manifest['Digest'] == digest

        if digest_match:
            return _image_managed_result(name, True, 'Image up-do-date')
        elif not digest_match and not force:
            return _image_managed_result(name, False, 'Image digest conflict')
        elif not digest_match and force:
            if __opts__['test']:
                return _image_managed_result(
                    name, None, 'Would force-push archive',
                    pchanges=_image_managed_changes(
                        name, digest, image_manifest['Digest']
                    ),
                )
            else:
                result = __salt__['docker_registry.push_docker_archive'](
                    archive_path=archive_path,
                    destination=name,
                    dest_tls_verify=tls_verify)

                if result:
                    return _image_managed_result(
                        name, True, 'Force-pushed archive',
                        changes=_image_managed_changes(
                            name, digest, image_manifest['Digest']
                        ),
                    )
                else:
                    return _image_managed_result(
                        name, False, 'Failed to push image',
                    )
        else:
            assert False, 'Logic error'
    elif image_manifest is not None and digest is None:
        if not force:
            return _image_managed_result(name, True, 'Image exists')
        else:
            if __opts__['test']:
                return _image_managed_result(
                    name, None, 'Would force-push image',
                    pchanges=_image_managed_changes(
                        name, digest, image_manifest['Digest'],
                    ),
                )
            else:
                result = __salt__['docker_registry.push_docker_archive'](
                    archive_path=archive_path,
                    destination=name,
                    dest_tls_verify=tls_verify)
                if result:
                    return _image_managed_result(
                        name, True, 'Force-pushed image',
                        changes=_image_managed_changes(
                            name, digest, image_manifest['Digest'],
                        ),
                    )
                else:
                    return _image_managed_result(
                        name, False, 'Failed to push image',
                    )

    elif image_manifest is None:
        return _image_managed_new_image(name, archive_path, digest, tls_verify)
    else:
        assert False, 'Logic error'
