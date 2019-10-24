"""Execution methods for management of Kubernetes objects.

This module relies on the `metalk8s_kubernetes` custom Salt utils module for
parsing K8s object manifests, and providing direct bindings to the Python
`kubernetes.client` models and APIs.

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

    if not 'metalk8s_kubernetes.get_kind_info' in __utils__:
        return False, 'Missing `metalk8s_kubernetes` utils module'

    return __virtualname__


def _extract_obj_and_kind_info(manifest):
    try:
        kind_info = __utils__['kubernetes.get_kind_info'](manifest)
        obj = __utils__['kubernetes.convert_manifest_into_object'](manifest)
    except ValueError as exc:
        raise CommandExecutionError('Invalid manifest: {!s}'.format(exc))

    return obj, kind_info


def _handle_error(exception, method):
    """Wrap an exception raised during a call to the K8s API.

    Note that 'retrieve' and 'delete' will not re-raise if the error is just
    a "404 NOT FOUND", and instead return `None`.
    """
    base_msg = 'Failed to {} object: '.format(method)

    if method in ('create', 'replace'):
        raise CommandExecutionError(base_msg + str(exception))

    if isinstance(exception, ApiException) and exception.status == 404:
        return None
    else:
        raise CommandExecutionError(base_msg + str(exception))


def _object_manipulation_function(method):
    """Generate an execution function based on a CRUD method to use."""

    # NOTE: `update` is not yet supported, since not used
    assert method in ('create', 'retrieve', 'replace', 'delete'), (
        'Method "{}" is not supported'.format(method)
    )

    def method(manifest=None, source=None, kubeconfig=None, context=None):
        if source is not None:
            if manifest is not None:
                raise CommandExecutionError(
                    'Cannot use both "manifest" and "source"'
                )

            try:
                with open(source, 'r') as stream:
                    manifest = yaml.safe_load(stream)
            except IOError as exc:
                raise CommandExecutionError(
                    'Failed to read file "{}": {}'.format(source, str(exc))
                )
            except yaml.YAMLError as exc:
                raise CommandExecutionError(
                    'Invalid YAML in file "{}": {}'.format(source, str(exc))
                )
        elif manifest is None:
            raise CommandExecutionError(
                'Must provide one of "manifest" or "source"'
            )

        obj, kind_info = _extract_obj_and_kind_info(manifest)

        kwargs = {}
        if method != 'create':
            kwargs['name'] = obj.metadata.name
        if kind_info.scope == 'namespaced':
            kwargs['namespace'] = obj.metadata.namespace
        if method == 'delete':
            kwargs['body'] = kubernetes.client.V1DeleteOptions()
        else:
            # TODO: check whether we should use `manifest` or `obj.to_dict()`
            kwargs['body'] = manifest

        client = kind_info.client
        client.configure(config_file=kubeconfig, context=context)
        method_func = getattr(client, method)

        try:
            result = method_func(**kwargs)
        except (ApiException, HTTPError) as exc:
            return _handle_error(exc, method)

        # NOTE: result is always either a standard `kubernetes.client` model,
        # or a `CustomObject` as defined in the __utils__ module.
        return result.to_dict()

    method.__doc__ = """{verb} an object from its manifest.

    A manifest should be passed in standard Kubernetes format as a dictionary,
    or through a filepath.

    TODO: standard Salt module examples and docstring...
    """.format(verb=method.capitalize())

    return method


create_object = _object_manipulation_function('create')
delete_object = _object_manipulation_function('delete')
replace_object = _object_manipulation_function('replace')
get_object = _object_manipulation_function('retrieve')
