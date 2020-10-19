"""Execution methods for management of Kubernetes objects.

This module relies on the `metalk8s_kubernetes` custom Salt utils module for
parsing K8s object manifests, and providing direct bindings to the Python
`kubernetes.client` models and APIs.

Core methods (create_, get_, remove_, and replace_object) are defined in this
module, while other methods can be found in `metalk8s_kubernetes_utils.py`,
`metalk8s_drain.py` and `metalk8s_cordon.py`.
"""

import json
import logging
import re

from salt.exceptions import CommandExecutionError
from salt.utils import yaml
import salt.utils.data

MISSING_DEPS = []

try:
    import kubernetes.client as k8s_client
    from kubernetes.client.rest import ApiException
except ImportError:
    MISSING_DEPS.append('kubernetes.client')

try:
    from urllib3.exceptions import HTTPError
except ImportError:
    MISSING_DEPS.append('urllib3')

log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    if MISSING_DEPS:
        error_msg = 'Missing dependencies: {}'.format(', '.join(MISSING_DEPS))
        return False, error_msg

    if 'metalk8s_kubernetes.get_kind_info' not in __utils__:
        return False, 'Missing `metalk8s_kubernetes` utils module'

    return __virtualname__


def _extract_obj_and_kind_info(manifest, force_custom_object=False):
    try:
        kind_info = __utils__['metalk8s_kubernetes.get_kind_info'](manifest)
        obj = __utils__['metalk8s_kubernetes.convert_manifest_to_object'](
            manifest, force_custom_object=force_custom_object
        )
    except ValueError as exc:
        raise CommandExecutionError('Invalid manifest: {!s}'.format(exc))

    return obj, kind_info


def _handle_error(exception, action):
    """Wrap an exception raised during a call to the K8s API.

    Note that 'retrieve' and 'delete' will not re-raise if the error is just
    a "404 NOT FOUND", and instead return `None`.
    """
    base_msg = 'Failed to {} object: '.format(action)

    if action in ['delete', 'retrieve'] and \
            isinstance(exception, ApiException) and exception.status == 404:
        return None
    else:
        raise CommandExecutionError(base_msg + str(exception))


def _object_manipulation_function(action):
    """Generate an execution function based on a CRUD method to use."""
    assert action in ('create', 'retrieve', 'replace', 'delete', 'update'), (
        'Method "{}" is not supported'.format(action)
    )

    def method(manifest=None, name=None, kind=None, apiVersion=None,
               namespace='default', patch=None, old_object=None,
               template='jinja', defaults=None, saltenv='base', **kwargs):
        if manifest is None:
            if action in ['retrieve', 'delete', 'update'] and \
                    name and kind and apiVersion and \
                    (action != 'update' or patch):
                # Build a simple manifest using kwargs information as
                # get/delete do not need a full body
                manifest = {
                    'apiVersion': apiVersion,
                    'kind': kind,
                    'metadata': {
                        'name': name,
                        'namespace': namespace
                    }
                }
            elif name and not kind and not apiVersion and not patch:
                try:
                    manifest = __salt__[
                        'metalk8s_kubernetes.read_and_render_yaml_file'
                    ](
                        source=name,
                        template=template,
                        context=defaults,
                        saltenv=saltenv
                    )
                except IOError as exc:
                    raise CommandExecutionError(
                        'Failed to read file "{}": {}'
                        .format(name, str(exc))
                    )
                except yaml.YAMLError as exc:
                    raise CommandExecutionError(
                        'Invalid YAML in file "{}": {}'
                        ''.format(name, str(exc))
                    )
        elif name is not None:
            raise CommandExecutionError(
                'Cannot use both "manifest" and "name".'
            )

        if not manifest:
            needed_params = ['"manifest"', '"name" (path to a file)']
            if action in ['retrieve', 'delete', 'update']:
                needed_params.append(' and '.join(
                    ['"name"', '"kind"', '"apiVersion"'] +
                    (['"patch"'] if action == 'update' else [])
                ))
            raise CommandExecutionError(
                'Must provide one of {} to {} object.'.format(
                    ' or '.join(needed_params),
                    action
                )
            )

        # Format slots on the manifest
        manifest = __salt__.metalk8s.format_slots(manifest)

        # Adding label containing metalk8s version (retrieved from saltenv)
        if action in ['create', 'replace']:
            match = re.search(r'^metalk8s-(?P<version>.+)$', saltenv)
            manifest.setdefault('metadata', {}).setdefault('labels', {})[
                'metalk8s.scality.com/version'
            ] = match.group('version') if match else "unknown"
            manifest['metadata']['labels']['app.kubernetes.io/managed-by'] = \
                'salt'
            manifest['metadata']['labels']['heritage'] = 'salt'

        log.debug(
            '%sing object with manifest: %s',
            action[:-1].capitalize(), manifest
        )

        obj, kind_info = _extract_obj_and_kind_info(
            manifest,
            # NOTE: For "retrieve", "delete" and "update" we don't need a full
            # kubernetes object we only need "kind", "apiVersion", "name"
            # (, "namespace")(and a patch for "update"), so we can not
            # create a Python kubernetes objects as some required field may
            # not be in the manifest
            force_custom_object=action in ['retrieve', 'delete', 'update']
        )

        call_kwargs = {}
        if action != 'create':
            call_kwargs['name'] = obj.metadata.name
        if kind_info.scope == 'namespaced':
            call_kwargs['namespace'] = obj.metadata.namespace
        if action == 'delete':
            call_kwargs['body'] = k8s_client.V1DeleteOptions(
                propagation_policy='Foreground'
            )
        elif action == 'update':
            if patch:
                call_kwargs['body'] = patch
            else:
                call_kwargs['body'] = manifest
                # When patching remove "searching" key like kind and apiVersion
                call_kwargs['body'].pop('kind')
                call_kwargs['body'].pop('apiVersion')
                call_kwargs['body']['metadata'].pop('name')
                # Namespace may be empty so add a default to not failing
                call_kwargs['body']['metadata'].pop('namespace', None)
        elif action != 'retrieve':
            call_kwargs['body'] = obj

        if action == 'replace' and old_object:
            # Some attributes have to be preserved
            # otherwise exceptions will be thrown
            if 'resource_version' in old_object['metadata']:
                call_kwargs['body'].metadata.resource_version = \
                    old_object['metadata']['resource_version']
            if 'resourceVersion' in old_object['metadata']:
                call_kwargs['body'].metadata.resourceVersion = \
                    old_object['metadata']['resourceVersion']
            # Keep `cluster_ip` if not present in the body
            if obj.api_version == 'v1' and obj.kind == 'Service' \
                    and not call_kwargs['body'].spec.cluster_ip:
                call_kwargs['body'].spec.cluster_ip = \
                    old_object['spec']['cluster_ip']

        kubeconfig, context = __salt__[
            'metalk8s_kubernetes.get_kubeconfig'
        ](**kwargs)

        client = kind_info.client
        client.configure(config_file=kubeconfig, context=context)
        method_func = getattr(client, action)

        log.debug("Running '%s' with: %s", action, call_kwargs)

        try:
            result = method_func(**call_kwargs)
        except (ApiException, HTTPError) as exc:
            return _handle_error(exc, action)

        # NOTE: result is always either a standard `kubernetes.client` model,
        # or a `CustomObject` as defined in the __utils__ module.
        return result.to_dict()

    base_doc = """
    {verb} an object from its manifest.

    A manifest should be passed in standard Kubernetes format as a dictionary,
    or through a filepath.""".format(verb=action.capitalize())

    if action in ['create', 'replace']:
        method.__doc__ = """{base_doc}

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.{cmd}_object name=/root/object.yaml
        salt-call metalk8s_kubernetes.{cmd}_object manifest="{manifest}"
        """.format(
            manifest=str({
                'kind': 'Pod', 'apiVersion': 'v1',
                'metadata': {'name': 'busybox', 'namespace': 'default'},
                'spec': {'containers': {
                    'image': 'busybox', 'command': ['sleep', '3600'],
                    'name': 'busybox'
                }, 'restartPolicy': 'Always'}
            }),
            base_doc=base_doc,
            cmd=action
        )
    elif action in ['retrieve', 'delete']:
        method.__doc__ = """{base_doc}
    Ability to {verb} an object using object description 'name', 'kind'
    and 'apiVersion'.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.{cmd}_object name=/root/object.yaml
        salt-call metalk8s_kubernetes.{cmd}_object manifest="{manifest}"
        salt-call metalk8s_kubernetes.{cmd}_object name="bootstrap" kind="Node" apiVersion="v1"
        salt-call metalk8s_kubernetes.{cmd}_object name="coredns-123" kind="Pod" apiVersion="v1" namespace="kube-system"
        """.format(
            manifest=str({
                'kind': 'Node', 'apiVersion': 'v1',
                'metadata': {'name': 'bootstrap'}
            }),
            base_doc=base_doc,
            verb=action,
            cmd='get' if action == 'retrieve' else action
        )
    elif action == 'update':
        method.__doc__ = """{base_doc}
    Ability to {verb} an object using object description and a patch 'name',
    'kind', 'apiVersion' and patch'.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.{cmd}_object name=/root/patch.yaml
        salt-call metalk8s_kubernetes.{cmd}_object manifest="{manifest}"
        salt-call metalk8s_kubernetes.{cmd}_object name="bootstrap" kind="Node" apiVersion="v1" patch="{patch1}"
        salt-call metalk8s_kubernetes.{cmd}_object name="bootstrap" kind="Node" apiVersion="v1" patch="{patch2}"
        """.format(
            manifest=str({
                'kind': 'Node', 'apiVersion': 'v1',
                'metadata': {
                    'name': 'bootstrap', 'labels': {'test.12': 'foo'}
                }
            }),
            patch1=str({'metadata': {'labels': {'test.12': 'bar'}}}),
            patch2=str([{'op': 'remove', 'path': '/metadata/labels/test.12'}]),
            base_doc=base_doc,
            verb=action,
            cmd=action
        )

    return method


create_object = _object_manipulation_function('create')
delete_object = _object_manipulation_function('delete')
replace_object = _object_manipulation_function('replace')
get_object = _object_manipulation_function('retrieve')
update_object = _object_manipulation_function('update')


# Check if a specific object exists
def object_exists(kind, apiVersion, name, **kwargs):
    """
    Simple helper to check if an object exists or not

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.object_exists kind="Node" apiVersion="v1" name="MyNode"
    """
    return get_object(
        kind=kind, apiVersion=apiVersion, name=name, **kwargs
    ) is not None


# Listing resources can benefit from a simpler signature
def list_objects(kind, apiVersion, namespace='default', all_namespaces=False,
                 field_selector=None, label_selector=None, **kwargs):
    """
    List all objects of a type using some object description.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.list_objects kind="Pod" apiVersion="v1"
        salt-call metalk8s_kubernetes.list_objects kind="Pod" apiVersion="v1" namespace="kube-system"
        salt-call metalk8s_kubernetes.list_objects kind="Pod" apiVersion="v1" all_namespaces=True field_selector="spec.nodeName=bootstrap"
    """
    try:
        kind_info = __utils__['metalk8s_kubernetes.get_kind_info']({
            'kind': kind,
            'apiVersion': apiVersion,
        })
    except ValueError as exc:
        raise CommandExecutionError(
            'Unsupported resource "{}/{}": {!s}'.format(
                apiVersion, kind, exc
            )
        )

    call_kwargs = {}
    if all_namespaces:
        call_kwargs['all_namespaces'] = True
    elif kind_info.scope == 'namespaced':
        call_kwargs['namespace'] = namespace
    if field_selector:
        call_kwargs['field_selector'] = field_selector
    if label_selector:
        call_kwargs['label_selector'] = label_selector

    kubeconfig, context = __salt__[
        'metalk8s_kubernetes.get_kubeconfig'
    ](**kwargs)

    client = kind_info.client
    client.configure(config_file=kubeconfig, context=context)

    try:
        result = client.list(**call_kwargs)
    except (ApiException, HTTPError) as exc:
        base_msg = 'Failed to list resources "{}/{}"'.format(apiVersion, kind)
        if 'namespace' in call_kwargs:
            base_msg += ' in namespace "{}"'.format(namespace)
        raise CommandExecutionError('{}: {!s}'.format(base_msg, exc))

    return [obj.to_dict() for obj in result.items]


def get_object_digest(path=None, checksum='sha256', *args, **kwargs):
    """
    Helper to get the digest of one kubernetes object or from a specific key
    of this object using a path
    (usefull to get the digest of one config from ConfigMap)

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.get_object_digest kind="ConfigMap" apiVersion="v1" name="my-config-map" path="data:config.yaml"
        salt-call metalk8s_kubernetes.get_object_digest kind="Pod" apiVersion="v1" name="my-pod"
    """
    obj = get_object(*args, **kwargs)

    if not obj:
        raise CommandExecutionError('Unable to find the object')

    if path:
        obj = salt.utils.data.traverse_dict_and_list(obj, path, delimiter=':')

        if not obj:
            raise CommandExecutionError(
                'Unable to find key "{}" in the object'.format(
                    path
                )
            )

    if isinstance(obj, dict):
        obj = json.dumps(obj, sort_keys=True)

    return __salt__.hashutil.digest(str(obj), checksum=checksum)
