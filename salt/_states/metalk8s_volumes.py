# coding: utf-8
'''State module to deal with MetalK8s Volume.'''

import logging

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_volumes'


def __virtual__():
    return __virtualname__


def present(name, volume):
    """Ensure that the backing storage exists for the specified volume.

    Args:
        name   (str): SLS caller name
        volume (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.exists'](volume):
        ret['result'] = True
        ret['comment'] = 'Storage for volume {} already exists.'.format(volume)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][volume] = 'Present'
        ret['result'] = None
        ret['comment'] = 'Storage for volume {} is going to be created.'\
            .format(volume)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.create'](volume)
    except Exception as exn:
        ret['result'] = False
        ret['comment'] = 'Cannot create storage for volume {}: {}.'\
            .format(volume, exn)
    else:
        ret['changes'][volume] = 'Present'
        ret['result'] = True
        ret['comment'] = 'Storage for volume {} created.'.format(volume)
    return ret


def provisioned(name, volume):
    """Provision the given volume.

    Args:
        name   (str): SLS caller name
        volume (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.is_provisioned'](volume):
        ret['result'] = True
        ret['comment'] = 'Storage for volume {} already provisioned.'\
            .format(volume)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][volume] = 'Provisioned'
        ret['result'] = None
        ret['comment'] = 'Storage for volume {} is going to be provisioned.'\
            .format(volume)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.provision'](volume)
    except CommandExecutionError as exn:
        ret['result'] = False
        ret['comment'] = 'Storage provisioning for volume {} failed: {}.'\
            .format(volume, exn)
    else:
        ret['changes'][volume] = 'Provisioned'
        ret['result'] = True
        ret['comment'] = 'Storage provisioned for volume {}.'.format(volume)
    return ret


def formatted(name, volume):
    """Format the given volume.

    Args:
        name   (str): SLS caller name
        volume (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.is_formatted'](volume):
        ret['result'] = True
        ret['comment'] = 'Volume {} already formatted.'.format(volume)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][volume] = 'Formatted'
        ret['result'] = None
        ret['comment'] = 'Volume {} is going to be formatted.'.format(volume)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.format'](volume)
    except Exception as exn:
        ret['result'] = False
        ret['comment'] = 'Failed to format volume {}: {}.'.format(volume, exn)
    else:
        ret['changes'][volume] = 'Formatted'
        ret['result'] = True
        ret['comment'] = 'Volume {} formatted.'.format(volume)
    return ret
