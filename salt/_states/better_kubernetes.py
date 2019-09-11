"""Management of Kubernetes objects as Salt states.

This module defines two state functions: `object_present` and `object_absent`.
Those will then simply delegate all the logic to the `metalk8s_kubernetes`
execution module, only managing simple dicts in this state module.
"""
from salt.exceptions import CommandExecutionError

__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    if 'metalk8s_kubernetes.ping' not in __salt__:
        return False, '`metalk8s_kubernetes` module is unavailable'
    return __virtualname__

def object_absent(name, kubeconfig, context, manifest):
    """Ensure that the object is absent."""
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}

    obj = __salt__['metalk8s_kubernetes.get_object'](
        name, kubeconfig, context, manifest
    )

    if obj is None:
        ret['result'] = True if not __opts__['test'] else None
        ret['comment'] = 'The object does not exist'
        return ret

    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'The object is going to be deleted'
        return ret

    try:
        __salt__['metalk8s_kubernetes.delete_object'](obj)
    except CommandExecutionError as exc:
        ret['comment'] = 'Something went wrong: {}'.format(exc)
    else:
        ret['result'] = True
        ret['changes'] = {'old': 'present', 'new': 'absent'}
        ret['comment'] = 'The object was deleted'

    return ret


def object_present(name, kubeconfig, context, manifest):
    """Ensure that the object is present."""
    ret = {'name': name, 'changes': {}, 'result': False, 'comment': ''}

    obj = __salt__['metalk8s_kubernetes.get_object'](
        name, kubeconfig, context, manifest
    )
    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'The object is going to be {}'.format(
            'created' if obj is None else 'replaced'
        )
        return ret

    if obj is None:
        try:
            __salt__['metalk8s_kubernetes.create_object'](
                name, kubeconfig, context, manifest
            )
        except CommandExecutionError as exc:
            ret['comment'] = 'Something went wrong: {}'.format(exc)
        else:
            ret['result'] = True
            ret['changes'] = {'old': 'absent', 'new': 'absent'}
            ret['comment'] = 'The object was created'

        return ret

    try:
        new = __salt__['metalk8s_kubernetes.replace_object'](
            name, kubeconfig, context, manifest
        )
    except CommandExecutionError as exc:
        ret['comment'] = 'Something went wrong: {}'.format(exc)
    else:
        ret['result'] = True
        diff = __utils__['dictdiffer.recursive_diff'](obj, new)
        ret['changes'] = {'diff': diff.change_str}
        ret['comment'] = 'The object was replaced'

    return ret
