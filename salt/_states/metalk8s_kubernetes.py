"""Management of Kubernetes objects as Salt states.

This module defines two state functions: `object_present` and `object_absent`.
Those will then simply delegate all the logic to the `metalk8s_kubernetes`
execution module, only managing simple dicts in this state module.

.. todo::

   - Add support for patching objects (needed for annotations/labels/taints)
   - Document usage of these state functions
   - Support using a source file instead of inlining the manifest, and also
     support the common Salt templating arguments
"""
from salt.exceptions import CommandExecutionError

__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    if 'metalk8s_kubernetes.object_present' not in __salt__:
        return False, 'Missing `metalk8s_kubernetes` execution module'
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
        result = __salt__['metalk8s_kubernetes.delete_object'](obj)
    except CommandExecutionError as exc:
        ret['comment'] = 'Failed to delete object: {}'.format(exc)
    else:
        ret['result'] = True

        if result is not None:
            ret['changes'] = {'old': 'present', 'new': 'absent'}
            ret['comment'] = 'The object was deleted'
        else:
            # This happens if the DELETE call fails with a 404 status
            ret['comment'] = 'The object does not exist'

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
            ret['comment'] = 'Failed to create object: {}'.format(exc)
        else:
            ret['result'] = True
            ret['changes'] = {'old': 'absent', 'new': 'present'}
            ret['comment'] = 'The object was created'

        return ret

    # TODO: Attempt to handle idempotency as much as possible here, we don't
    #       want to always replace if nothing changed. Currently though, we
    #       don't know how to achieve this, since some fields may be set by
    #       api-server or by the user without us being able to distinguish
    #       them.
    try:
        new = __salt__['metalk8s_kubernetes.replace_object'](
            name, kubeconfig, context, manifest
        )
    except CommandExecutionError as exc:
        ret['comment'] = 'Failed to replace object: {}'.format(exc)
    else:
        ret['result'] = True
        diff = __utils__['dictdiffer.recursive_diff'](obj, new)
        ret['changes'] = {'diff': diff.change_str}
        ret['comment'] = 'The object was replaced'

    return ret
