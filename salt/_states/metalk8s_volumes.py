# coding: utf-8
'''State module to deal with MetalK8s Volume.'''

import logging

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_volumes'


def __virtual__():
    return __virtualname__


def sparse_file_present(name, path, capacity):
    """Ensure that the specified sparse file exists with the given capcity.

    Args:
        name     (str):  SLS caller name
        parh     (str):  path of the sparse file
        capacity (str):  capacity of the sparse file

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.sparse_file_exists'](path, capacity):
        ret['result'] = True
        ret['comment'] = 'sparse file `{}` already exists'.format(path)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][path] = 'Present'
        ret['result'] = None
        ret['comment'] = 'sparse file `{}` is going to be created'.format(path)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.sparse_file_create'](path, capacity)
    except Exception as exn:
        ret['result'] = False
        ret['comment'] = 'cannot create sparse file `{}`: {}'.format(path, exn)
    else:
        ret['changes'][path] = 'Present'
        ret['result'] = True
        ret['comment'] = 'sparse file created at `{}`'.format(path)
    return ret


def sparse_loop_initialized(name, path):
    """Initialize the give sparse loop device.

    Args:
        name (str):  SLS caller name
        path (str):  path of the sparse file

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.sparse_loop_is_initialized'](path):
        ret['result'] = True
        ret['comment'] = 'sparse loop device `{}` already initialized'.format(
            path
        )
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][path] = 'Initialized'
        ret['result'] = None
        ret['comment'] = 'sparse loop device `{}` is going to be initialized'\
            .format(path)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.sparse_loop_initialize'](path)
    except CommandExecutionError as exn:
        ret['result'] = False
        ret['comment'] = 'sparse loop device `{}` initialization failed: {}'\
            .format(path, exn)
    else:
        ret['changes'][path] = 'Initialized'
        ret['result'] = True
        ret['comment'] = 'sparse loop device `{}` initialized'.format(path)
    return ret


def formatted(name, volume):
    """Initialize the give sparse loop device.

    Args:
        name   (str):  SLS caller name
        volume (str):  path of the sparse file

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.is_formatted'](volume):
        ret['result'] = True
        ret['comment'] = 'volume `{}` already formatted'.format(volume)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][volume] = 'Formatted'
        ret['result'] = None
        ret['comment'] = 'volume `{}` is going to be formatted'.format(volume)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.mkfs'](volume)
    except Exception as exn:
        ret['result'] = False
        ret['comment'] = 'failed to format volume `{}`: {}'.format(volume, exn)
    else:
        ret['changes'][volume] = 'Formatted'
        ret['result'] = True
        ret['comment'] = 'volume `{}` formatted'.format(volume)
    return ret
