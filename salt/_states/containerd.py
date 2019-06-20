'''
States to manage the :program:`containerd` CRI runtime.
'''

import logging
import os

log = logging.getLogger(__name__)


__virtualname__ = 'containerd'


def __virtual__():
    if 'cri.list_images' not in __salt__:
        return (False, "Missing 'cri' module")
    if 'containerd.load_cri_image' not in __salt__:
        return (False, "Missing 'containerd' module")

    return __virtualname__


def image_managed(name, archive_path=None):
    '''
    Pull or load an image in the CRI image cache.

    name
        Tag or digest of the image
    archive_path : None
        Optional local Docker archive of the image to load if image not present.
        If this is set, no pull will be performed.
    '''

    ret = {
        'name': name,
        'result': False,
        'changes': {},
        'pchanges': {},
        'comment': '',
    }


    if __salt__['cri.available'](name):
        ret['comment'] = 'Image already available'
        ret['result'] = True
        return ret

    if archive_path:
        if __opts__['test']:
            ret['comment'] = 'Will import archive'
            ret['result'] = None
            ret['pchanges'].update({
                name: {
                    'old': {},
                    'new': {
                        'name': name,
                        'digests': {},
                    },
                },
            })
            return ret

        result = __salt__['containerd.load_cri_image'](path=archive_path)
        # ctr can fail to load the image and exit silently
        if result['retcode'] == 0 and __salt__['cri.available'](name):
            ret['changes'].update({
                name: {
                    'old': {},
                    'new': os.path.basename(archive_path),
                },
            })
            ret['comment'] = 'Imported archive'
            ret['result'] = True
        else:
            ret['comment'] = 'Failed to import archive: {}'.format(
                result['stderr'] or result['stdout']
            )
        return ret
    else:
        if __opts__['test']:
            ret['comment'] = 'Will pull image'
            ret['result'] = None
            ret['pchanges'].update({
                name: {
                    'old': {},
                    'new': {
                        'name': name,
                        'digests': {},
                    },
                },
            })
            return ret

        result = __salt__['cri.pull_image'](name)
        if result:
            ret['changes'].update({
                name: {
                    'old': {},
                    'new': result,
                },
            })
            ret['comment'] = 'Pulled image'
            ret['result'] = True
        else:
            ret['comment'] = 'Failed to pull image'

    return ret
