# coding: utf-8
'''State module to deal with MetalK8s Volume.'''

import logging

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_volumes'


def __virtual__():
    return __virtualname__


def present(name):
    """Ensure that the backing storage exists for the specified volume.

    Args:
        name (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.exists'](name):
        ret['result'] = True
        ret['comment'] = 'Storage for volume {} already exists.'.format(name)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][name] = 'Present'
        ret['result'] = None
        ret['comment'] = 'Storage for volume {} is going to be created.'\
            .format(name)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.create'](name)
    except Exception as exn:
        ret['result'] = False
        ret['comment'] = 'Cannot create storage for volume {}: {}.'\
            .format(name, exn)
    else:
        ret['changes'][name] = 'Present'
        ret['result'] = True
        ret['comment'] = 'Storage for volume {} created.'.format(name)
    return ret


def provisioned(name):
    """Provision the given volume.

    Args:
        name (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.is_provisioned'](name):
        ret['result'] = True
        ret['comment'] = 'Storage for volume {} already provisioned.'\
            .format(name)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][name] = 'Provisioned'
        ret['result'] = None
        ret['comment'] = 'Storage for volume {} is going to be provisioned.'\
            .format(name)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.provision'](name)
    except CommandExecutionError as exn:
        ret['result'] = False
        ret['comment'] = 'Storage provisioning for volume {} failed: {}.'\
            .format(name, exn)
    else:
        ret['changes'][name] = 'Provisioned'
        ret['result'] = True
        ret['comment'] = 'Storage provisioned for volume {}.'.format(name)
    return ret


def formatted(name):
    """Format the given volume.

    Args:
        name (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.is_formatted'](name):
        ret['result'] = True
        ret['comment'] = 'Volume {} already formatted.'.format(name)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][name] = 'Formatted'
        ret['result'] = None
        ret['comment'] = 'Volume {} is going to be formatted.'.format(name)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.format'](name)
    except Exception as exn:
        ret['result'] = False
        ret['comment'] = 'Failed to format volume {}: {}.'.format(name, exn)
    else:
        ret['changes'][name] = 'Formatted'
        ret['result'] = True
        ret['comment'] = 'Volume {} formatted.'.format(name)
    return ret


def removed(name):
    """Remove and cleanup the given volume.

    Args:
        name (str): Volume name

    Returns:
        dict: state return value
    """
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}
    # Idempotence.
    if __salt__['metalk8s_volumes.is_cleaned_up'](name):
        ret['result'] = True
        ret['comment'] = 'Volume {} already cleaned up.'.format(name)
        return ret
    # Dry-run.
    if __opts__['test']:
        ret['changes'][name] = 'Cleaned up'
        ret['result'] = None
        ret['comment'] = 'Volume {} is going to be cleaned up.'.format(name)
        return ret
    # Let's go for real.
    try:
        __salt__['metalk8s_volumes.clean_up'](name)
    except Exception as exn:
        ret['result'] = False
        ret['comment'] = 'Failed to clean up volume {}: {}.'.format(name, exn)
    else:
        ret['changes'][name] = 'Cleaned up'
        ret['result'] = True
        ret['comment'] = 'Volume {} cleaned up.'.format(name)
    return ret
