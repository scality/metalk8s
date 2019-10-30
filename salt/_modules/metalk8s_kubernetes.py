"""Execution methods for management of Kubernetes objects.

This module relies on the `metalk8s_kubernetes` custom Salt utils module for
parsing K8s object manifests, and providing direct bindings to the Python
`kubernetes.client` models and APIs.

Core methods (create_, get_, remove_, and replace_object) are defined in this
module, while other methods can be found in `metalk8s_kubernetes_utils.py`,
`metalk8s_drain.py` and `metalk8s_cordon.py`.

TODO:
- add some logging for debug purposes
- support giving a `path` to a file instead of directly the `manifest` data
- improve management of `kubeconfig` and `context` parameters, relying on
  master configuration and sane defaults - look into `__opts__`
"""
from salt.exceptions import CommandExecutionError
from salt.utils import yaml

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

__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    if MISSING_DEPS:
        error_msg = 'Missing dependencies: {}'.format(', '.join(MISSING_DEPS))
        return False, error_msg

    if 'metalk8s_kubernetes.get_kind_info' not in __utils__:
        return False, 'Missing `metalk8s_kubernetes` utils module'

    return __virtualname__


def _extract_obj_and_kind_info(manifest):
    try:
        kind_info = __utils__['metalk8s_kubernetes.get_kind_info'](manifest)
        obj = __utils__['metalk8s_kubernetes.convert_manifest_into_object'](
            manifest
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
        raise CommandExecutionError(base_msg + str(exception).decode('utf-8'))


def _object_manipulation_function(action):
    """Generate an execution function based on a CRUD method to use."""

    # NOTE: `update` is not yet supported, since not used
    assert action in ('create', 'retrieve', 'replace', 'delete', 'update'), (
        'Method "{}" is not supported'.format(action)
    )

    def method(manifest=None, kubeconfig=None, context=None, name=None,
               kind=None, apiVersion=None, namespace=None):
        if manifest is None:
            if action in ['retrieve', 'delete'] and \
                    name and kind and apiVersion:
                # Build a simple manifest using kwargs informations as
                # get/delete do not need a full body
                manifest = {
                    'apiVersion': apiVersion,
                    'kind': kind,
                    'metadata': {
                        'name': name,
                        'namespace': namespace or 'default'
                    }
                }
            elif name and not kind and not apiVersion:
                try:
                    with open(name, 'r') as stream:
                        manifest = yaml.safe_load(stream)
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
            if action in ['retrieve', 'delete']:
                needed_params.append('"name" and "kind" and "apiVersion"')
            raise CommandExecutionError(
                'Must provide one of {} to {} object.'.format(
                    ' or '.join(needed_params),
                    action
                )
            )

        obj, kind_info = _extract_obj_and_kind_info(manifest)

        kwargs = {}
        if action != 'create':
            kwargs['name'] = obj.metadata.name
        if kind_info.scope == 'namespaced':
            kwargs['namespace'] = obj.metadata.namespace or 'default'
        if action == 'delete':
            kwargs['body'] = k8s_client.V1DeleteOptions(
                propagation_policy='Foreground'
            )
        elif action == 'update':
            kwargs['body'] = manifest
            # When patching remove "searching" key like kind and apiVersion
            kwargs['body'].pop('kind')
            kwargs['body'].pop('apiVersion')
            kwargs['body']['metadata'].pop('name')
            # Namespace may be empty so add a default to not failing
            kwargs['body']['metadata'].pop('namespace', None)
        elif action != 'retrieve':
            kwargs['body'] = obj.to_dict()

        client = kind_info.client
        client.configure(config_file=kubeconfig, context=context)
        method_func = getattr(client, action)

        try:
            result = method_func(**kwargs)
        except (ApiException, HTTPError) as exc:
            return _handle_error(exc, action)

        # NOTE: result is always either a standard `kubernetes.client` model,
        # or a `CustomObject` as defined in the __utils__ module.
        return result.to_dict()

    method.__doc__ = """{verb} an object from its manifest.

    A manifest should be passed in standard Kubernetes format as a dictionary,
    or through a filepath.

    TODO: standard Salt module examples and docstring...
    """.format(verb=action.capitalize())

    return method


create_object = _object_manipulation_function('create')
delete_object = _object_manipulation_function('delete')
replace_object = _object_manipulation_function('replace')
get_object = _object_manipulation_function('retrieve')
update_object = _object_manipulation_function('update')


# Listing resources can benefit from a simpler signature
def list_objects(kind, api_version, namespace=None,
                 kubeconfig=None, context=None):
    try:
        kind_info = __utils__['metalk8s_kubernetes.get_kind_info']({
            'kind': kind,
            'apiVersion': api_version,
        })
    except ValueError as exc:
        raise CommandExecutionError(
            'Unsupported resource "{}/{}": {!s}'.format(
                api_version, kind, exc
            )
        )

    if kind_info.scope == 'namespaced':
        if namespace is None:
            raise CommandExecutionError(
                'Must provide a namespace for listing resources {}/{}'.format(
                    api_version, kind
                )
            )
        kwargs = {'namespace': namespace}
    else:
        kwargs = {}

    client = kind_info.client
    client.configure(config_file=kubeconfig, context=context)

    try:
        result = client.list(**kwargs)
    except (ApiException, HTTPError) as exc:
        base_msg = 'Failed to list resources "{}/{}"'.format(api_version, kind)
        if 'namespace' in kwargs:
            base_msg += ' in namespace "{}"'.format(namespace)
        raise CommandExecutionError('{}: {!s}'.format(base_msg, exc))

    return [obj.to_dict() for obj in result.items]
