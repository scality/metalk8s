"""Management of Kubernetes objects as Salt states.

This module defines three state functions: `object_present`, `object_absent`
and `object_updated`.
Those will then simply delegate all the logic to the `metalk8s_kubernetes`
execution module, only managing simple dicts in this state module.
"""
import time

__virtualname__ = "metalk8s_kubernetes"


def __virtual__():
    if "metalk8s_kubernetes.create_object" not in __salt__:
        return False, "Missing `metalk8s_kubernetes` execution module"
    return __virtualname__


def object_absent(name, manifest=None, wait=None, **kwargs):
    """Ensure that the object is absent.

    Arguments:
        name (str): Path to a manifest yaml file or just a name
        manifest (dict): Manifest content
        wait (bool): A boolean to enable waiting for object deletion
        wait (int): Number of retry to wait for object deletion (default: 5)
        wait (dict): Dict with number of retry to wait and time to sleep
            between each check of object deletion
            (default: 5 attempts and sleep 5 seconds)
    """
    ret = {"name": name, "changes": {}, "result": True, "comment": ""}

    if wait:
        if isinstance(wait, bool):
            wait = {}
        if isinstance(wait, int):
            wait = {"attempts": wait}
        if not isinstance(wait, dict):
            ret["comment"] = 'Invalid value for "wait" should be a bool, int or dict'
            ret["result"] = False
            return ret
        wait.setdefault("attempts", 5)
        wait.setdefault("sleep", 5)

    # Only pass `name` if we have no manifest
    name_arg = None if manifest else name

    obj = __salt__["metalk8s_kubernetes.get_object"](
        name=name_arg, manifest=manifest, saltenv=__env__, **kwargs
    )

    if obj is None:
        ret["comment"] = "The object does not exist"
        return ret

    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = "The object is going to be deleted"
        return ret

    result = __salt__["metalk8s_kubernetes.delete_object"](
        name=name_arg, manifest=manifest, saltenv=__env__, **kwargs
    )

    if result is None:
        # This happens if the DELETE call fails with a 404 status
        ret["comment"] = "The object does not exist"
        return ret

    if wait:
        attempts = 1
        while attempts <= wait["attempts"]:
            obj = __salt__["metalk8s_kubernetes.get_object"](
                name=name_arg, manifest=manifest, saltenv=__env__, **kwargs
            )
            if obj is None:
                break
            time.sleep(wait["sleep"])
            attempts += 1
        if attempts > wait["attempts"]:
            ret[
                "comment"
            ] = "The object is still present after {} check attempts".format(
                wait["attempts"]
            )
            ret["result"] = False
            return ret
        ret[
            "comment"
        ] = "The object was deleted and not present after {} check attempts".format(
            attempts
        )
    else:
        ret["comment"] = "The object was deleted"

    ret["changes"] = {"old": "present", "new": "absent"}

    return ret


def object_present(name, manifest=None, **kwargs):
    """Ensure that the object is present.

    Arguments:
        name (str): Path to a manifest yaml file
                    or just a name if manifest provided
        manifest (dict): Manifest content
    """
    ret = {"name": name, "changes": {}, "result": True, "comment": ""}

    manifest_content = manifest
    if not manifest_content:
        try:
            manifest_content = __salt__[
                "metalk8s_kubernetes.read_and_render_yaml_file"
            ](
                source=name,
                template=kwargs.get("template", "jinja"),
                context=kwargs.get("defaults"),
                saltenv=__env__,
            )
        except Exception:  # pylint: disable=broad-except
            # Do not fail if we are not able to load the YAML,
            # let the module raise if needed
            manifest_content = None

    # Only pass `name` if we have no manifest
    name_arg = None if manifest else name

    manifest_metadata = (manifest_content or {}).get("metadata", {})

    # We skip retrieving if this manifest has a "generateName"
    # in this case it's a unique object so we just want to create a new one
    if manifest_metadata.get("generateName"):
        obj = None
    else:
        obj = __salt__["metalk8s_kubernetes.get_object"](
            name=name_arg, manifest=manifest, saltenv=__env__, **kwargs
        )

    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = "The object is going to be {}".format(
            "created" if obj is None else "replaced"
        )
        return ret

    if obj is None:
        __salt__["metalk8s_kubernetes.create_object"](
            name=name_arg, manifest=manifest, saltenv=__env__, **kwargs
        )
        ret["changes"] = {"old": "absent", "new": "present"}
        ret["comment"] = "The object was created"

        return ret

    # TODO: Attempt to handle idempotency as much as possible here, we don't
    #       want to always replace if nothing changed. Currently though, we
    #       don't know how to achieve this, since some fields may be set by
    #       api-server or by the user without us being able to distinguish
    #       them.
    new = __salt__["metalk8s_kubernetes.replace_object"](
        name=name_arg, manifest=manifest, old_object=obj, saltenv=__env__, **kwargs
    )
    diff = __utils__["dictdiffer.recursive_diff"](obj, new)
    ret["changes"] = diff.diffs
    ret["comment"] = "The object was replaced"

    return ret


def object_updated(name, manifest=None, **kwargs):
    """Update an existing object.

    Arguments:
        name (str): Path to a manifest yaml file
                    or just a name if manifest provided
        manifest (dict): Manifest content
    """
    ret = {"name": name, "changes": {}, "result": True, "comment": ""}

    # Only pass `name` if we have no manifest
    name_arg = None if manifest else name

    obj = __salt__["metalk8s_kubernetes.get_object"](
        name=name_arg, manifest=manifest, saltenv=__env__, **kwargs
    )

    cmp_manifest = manifest
    if not cmp_manifest:
        try:
            cmp_manifest = __salt__["metalk8s_kubernetes.read_and_render_yaml_file"](
                source=name,
                template=kwargs.get("template", "jinja"),
                context=kwargs.get("defaults"),
                saltenv=__env__,
            )
        except Exception:  # pylint: disable=broad-except
            # Do not fail if we are not able to load the YAML,
            # consider that the object need to be updated and let the module
            # raise if needed
            cmp_manifest = None

    if cmp_manifest:
        if not __utils__["dictdiffer.recursive_diff"](obj, cmp_manifest).diffs:
            ret["comment"] = "The object is already good"
            return ret

    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = "The object is going to be updated"
        return ret

    new = __salt__["metalk8s_kubernetes.update_object"](
        name=name_arg, manifest=manifest, saltenv=__env__, **kwargs
    )
    diff = __utils__["dictdiffer.recursive_diff"](obj, new, False)
    ret["changes"] = diff.diffs
    ret["comment"] = "The object was updated"

    return ret
