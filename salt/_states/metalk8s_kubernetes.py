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
from salt.utils import yaml

__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    if 'metalk8s_kubernetes.create_object' not in __salt__:
        return False, 'Missing `metalk8s_kubernetes` execution module'
    return __virtualname__


def object_absent(name, manifest=None, **kwargs):
    """Ensure that the object is absent.

    Arguments:
        name (str): Path to a manifest yaml file or just a name
        manifest (dict): Manifest content
    """
    ret = {'name': name, 'changes': {}, 'result': True, 'comment': ''}

    # Only pass `name` if we have no manifest
    name_arg = None if manifest else name

    obj = __salt__['metalk8s_kubernetes.get_object'](
        name=name_arg, manifest=manifest,
        **kwargs)

    if obj is None:
        ret['comment'] = 'The object does not exist'
        return ret

    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'The object is going to be deleted'
        return ret

    result = __salt__['metalk8s_kubernetes.delete_object'](
        name=name_arg, manifest=manifest,
        **kwargs)

    if result is not None:
        ret['changes'] = {'old': 'present', 'new': 'absent'}
        ret['comment'] = 'The object was deleted'
    else:
        # This happens if the DELETE call fails with a 404 status
        ret['comment'] = 'The object does not exist'

    return ret


def object_present(name, manifest=None, **kwargs):
    """Ensure that the object is present.

    Arguments:
        name (str): Path to a manifest yaml file
                    or just a name if manifest provided
        manifest (dict): Manifest content
    """
    ret = {'name': name, 'changes': {}, 'result': True, 'comment': ''}

    # Only pass `name` if we have no manifest
    name_arg = None if manifest else name

    obj = __salt__['metalk8s_kubernetes.get_object'](
        name=name_arg, manifest=manifest,
        **kwargs
    )
    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'The object is going to be {}'.format(
            'created' if obj is None else 'replaced'
        )
        return ret

    if obj is None:
        __salt__['metalk8s_kubernetes.create_object'](
            name=name_arg, manifest=manifest,
            **kwargs
        )
        ret['changes'] = {'old': 'absent', 'new': 'present'}
        ret['comment'] = 'The object was created'

        return ret

    # TODO: Attempt to handle idempotency as much as possible here, we don't
    #       want to always replace if nothing changed. Currently though, we
    #       don't know how to achieve this, since some fields may be set by
    #       api-server or by the user without us being able to distinguish
    #       them.
    new = __salt__['metalk8s_kubernetes.replace_object'](
        name=name_arg, manifest=manifest,
        **kwargs
    )
    diff = __utils__['dictdiffer.recursive_diff'](obj, new)
    ret['changes'] = diff.diffs
    ret['comment'] = 'The object was replaced'

    return ret


def object_updated(name, manifest=None, **kwargs):
    """Update an existing object.

    Arguments:
        name (str): Path to a manifest yaml file
                    or just a name if manifest provided
        manifest (dict): Manifest content
    """
    ret = {'name': name, 'changes': {}, 'result': True, 'comment': ''}

    # Only pass `name` if we have no manifest
    name_arg = None if manifest else name

    obj = __salt__['metalk8s_kubernetes.get_object'](
        name=name_arg, manifest=manifest,
        **kwargs
    )

    cmp_manifest = manifest
    if not cmp_manifest:
        try:
            with open(name, 'r') as stream:
                cmp_manifest = yaml.safe_load(stream)
        except (IOError, yaml.YAMLError):
            # Do not fail if we are not able to load the YAML,
            # consider that the object need to be updated and let the module
            # raise if needed
            cmp_manifest = None

    if cmp_manifest:
        new_obj = __utils__['metalk8s_kubernetes.caml_to_snake'](cmp_manifest)

        if not __utils__['dictdiffer.recursive_diff'](obj, new_obj).diffs:
            ret['comment'] = 'The object is already good'
            return ret

    if __opts__['test']:
        ret['result'] = None
        ret['comment'] = 'The object is going to be updated'
        return ret

    new = __salt__['metalk8s_kubernetes.update_object'](
        name=name_arg, manifest=manifest,
        **kwargs
    )
    diff = __utils__['dictdiffer.recursive_diff'](obj, new, False)
    ret['changes'] = diff.diffs
    ret['comment'] = 'The object was updated'

    return ret
