"""Utility methods for manipulation of Kubernetes objects in Python.
"""
import datetime
from functools import partial
import inspect
import keyword
import operator
from pprint import pformat
import re

from salt.ext import six
from salt.utils.dictdiffer import recursive_diff

try:
    import kubernetes.config
    import kubernetes.client as k8s_client
    import kubernetes.client.apis as k8s_apis

    # Workaround for https://github.com/kubernetes-client/python/issues/376
    def set_conditions(self, conditions):
        if conditions is None:
            conditions = []
        self._conditions = conditions

    setattr(
        k8s_client.V1beta1CustomResourceDefinitionStatus, 'conditions',
        property(
            fget=k8s_client.V1beta1CustomResourceDefinitionStatus.conditions.fget,
            fset=set_conditions
        )
    )
    # End of workaround
except ImportError:
    HAS_LIBS = False
else:
    HAS_LIBS = True
    ALL_APIS = frozenset(
        api for _, api in inspect.getmembers(k8s_apis, inspect.isclass)
    )


__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    if not HAS_LIBS:
        return False, 'Missing dependencies: kubernetes'

    return __virtualname__


# Roughly equivalent to an Enum, for Python 2
class ObjectScope(object):
    NAMESPACE = 'namespaced'
    CLUSTER = 'cluster'

    ALL_VALUES = (NAMESPACE, CLUSTER)

    def __init__(self, value):
        if value not in self.ALL_VALUES:
            raise ValueError(
                'Value must be one of {}.'.format(self.ALL_VALUES)
            )
        self.value = value

    def __eq__(self, other):
        if isinstance(other, ObjectScope):
            return self.value == other.value
        if isinstance(other, six.string_types):
            return self.value == other
        return NotImplemented

    def __repr__(self):
        return 'ObjectScope({})'.format(self.value)


class ApiClient(object):
    CRUD_METHODS = {
        'create': 'create',
        'retrieve': 'read',
        'update': 'patch',
        'delete': 'delete',
        'replace': 'replace',
        'list': 'list',
    }

    def __init__(self, api_cls, name,
                 method_names=None, all_namespaces_name=None):
        if api_cls not in ALL_APIS:
            raise ValueError(
                '`api_cls` must be an API from `kubernetes.client.apis`'
            )
        methods = self.CRUD_METHODS
        if isinstance(method_names, six.string_types):
            method_names = [method_names]
        if isinstance(method_names, list):
            methods = {
                func_name: self.CRUD_METHODS[func_name]
                for func_name in method_names
            }
        if isinstance(method_names, dict):
            methods = method_names

        self._api_cls = api_cls
        self._name = name
        self._all_namespaces_name = all_namespaces_name
        self._api = None
        self._client = None

        # Attach the API CRUD methods at construction, so we can fail at
        # import-time instead of runtime
        self._api_methods = {
            method: getattr(api_cls, self._method_name(verb))
            for method, verb in methods.items()
        }

        if self._all_namespaces_name and 'list' in methods:
            self._api_methods['list_all_namespaces'] = \
                getattr(api_cls, self._all_namespaces_name)

    api_cls = property(operator.attrgetter('_api_cls'))
    name = property(operator.attrgetter('_name'))

    create = property(lambda self: self._method('create'))
    retrieve = property(lambda self: self._method('retrieve'))
    update = property(lambda self: self._method('update'))
    delete = property(lambda self: self._method('delete'))
    replace = property(lambda self: self._method('replace'))

    @property
    def list(self):
        def _list(all_namespaces=False, *args, **kwargs):
            if all_namespaces:
                assert self._all_namespaces_name, (
                    'Cannot use "all_namespaces" for this client'
                )
                return self._method('list_all_namespaces')(*args, **kwargs)
            return self._method('list')(*args, **kwargs)

        return _list

    def configure(self, config_file=None, context=None, persist_config=False):
        self._client = kubernetes.config.new_client_from_config(
            config_file, context, persist_config
        )

    @property
    def api(self):
        if self._api is None:
            assert self._client is not None, (
                'Cannot use API without configuring the client first'
            )
            self._api = self.api_cls(api_client=self._client)
        return self._api

    def _method_name(self, verb):
        return '{}_{}'.format(verb, self.name)

    def _method(self, method):
        # Inject the API instance as the first argument, since those methods
        # are not classmethods, yet stored unbound
        return partial(self._api_methods[method], self.api)


class KindInfo(object):
    """Wrapper for holding attributes related to an object kind.

    In particular, it holds a model class, and a wrapper `ApiClient` to use the
    relevant API through simple CRUD methods.
    CRUD methods can be filtered using `method_names` argument usefull for
    object that may not have all CRUD methods.
    """
    def __init__(self, model, api_cls, name, method_names=None):
        self._model = model
        if name.startswith('namespaced_'):
            self._scope = ObjectScope('namespaced')
            all_ns_method = 'list_{}_for_all_namespaces'.format(
                name[len('namespaced_'):]
            )
        else:
            self._scope = ObjectScope('cluster')
            all_ns_method = None
        self._client = ApiClient(
            api_cls,
            name,
            method_names=method_names,
            all_namespaces_name=all_ns_method
        )

    model = property(operator.attrgetter('_model'))
    client = property(operator.attrgetter('_client'))
    scope = property(operator.attrgetter('_scope'))


if HAS_LIBS:
    KNOWN_STD_KINDS = {
        # /api/v1/ {{{
        ('v1', 'ConfigMap'): KindInfo(
            model=k8s_client.V1ConfigMap,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_config_map',
        ),
        ('v1', 'Endpoints'): KindInfo(
            model=k8s_client.V1Endpoints,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_endpoints',
        ),
        ('v1', 'Namespace'): KindInfo(
            model=k8s_client.V1Namespace,
            api_cls=k8s_client.CoreV1Api,
            name='namespace',
        ),
        ('v1', 'Node'): KindInfo(
            model=k8s_client.V1Node,
            api_cls=k8s_client.CoreV1Api,
            name='node',
        ),
        ('v1', 'Pod'): KindInfo(
            model=k8s_client.V1Pod,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_pod'
        ),
        ('v1', 'PodEviction'): KindInfo(
            model=k8s_client.V1beta1Eviction,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_pod_eviction',
            method_names='create'
        ),
        ('v1', 'Secret'): KindInfo(
            model=k8s_client.V1Secret,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_secret',
        ),
        ('v1', 'Service'): KindInfo(
            model=k8s_client.V1Service,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_service',
        ),
        ('v1', 'ServiceAccount'): KindInfo(
            model=k8s_client.V1ServiceAccount,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_service_account',
        ),
        ('v1', 'ReplicationController'): KindInfo(
            model=k8s_client.V1ReplicationController,
            api_cls=k8s_client.CoreV1Api,
            name='namespaced_replication_controller',
        ),
        # }}}
        # /apis/apps/v1/ {{{
        ('apps/v1', 'DaemonSet'): KindInfo(
            model=k8s_client.V1DaemonSet,
            api_cls=k8s_client.AppsV1Api,
            name='namespaced_daemon_set',
        ),
        ('apps/v1', 'Deployment'): KindInfo(
            model=k8s_client.V1Deployment,
            api_cls=k8s_client.AppsV1Api,
            name='namespaced_deployment',
        ),
        ('apps/v1', 'ReplicaSet'): KindInfo(
            model=k8s_client.V1ReplicaSet,
            api_cls=k8s_client.AppsV1Api,
            name='namespaced_replica_set',
        ),
        ('apps/v1', 'StatefulSet'): KindInfo(
            model=k8s_client.V1StatefulSet,
            api_cls=k8s_client.AppsV1Api,
            name='namespaced_stateful_set',
        ),
        # }}}
        # /apis/apps/v1beta2/ {{{
        ('apps/v1beta2', 'DaemonSet'): KindInfo(
            model=k8s_client.V1beta2DaemonSet,
            api_cls=k8s_client.AppsV1beta2Api,
            name='namespaced_daemon_set',
        ),
        ('apps/v1beta2', 'Deployment'): KindInfo(
            model=k8s_client.V1beta2Deployment,
            api_cls=k8s_client.AppsV1beta2Api,
            name='namespaced_deployment',
        ),
        # }}}
        # /apis/extensions/v1beta1/ {{{
        ('extensions/v1beta1', 'Ingress'): KindInfo(
            model=k8s_client.ExtensionsV1beta1Ingress,
            api_cls=k8s_client.ExtensionsV1beta1Api,
            name='namespaced_ingress'
        ),
        # }}}
        # /apis/apiextensions.k8s.io/v1beta1/ {{{
        ('apiextensions.k8s.io/v1beta1', 'CustomResourceDefinition'): \
        KindInfo(
            model=k8s_client.V1beta1CustomResourceDefinition,
            api_cls=k8s_client.ApiextensionsV1beta1Api,
            name='custom_resource_definition',
        ),
        # }}}
        # /apis/apiregistration.k8s.io/v1/ {{{
        ('apiregistration.k8s.io/v1', 'APIService'): KindInfo(
            model=k8s_client.V1APIService,
            api_cls=k8s_client.ApiregistrationV1Api,
            name='api_service',
        ),
        # }}}
        # /apis/apiregistration.k8s.io/v1beta1/ {{{
        ('apiregistration.k8s.io/v1beta1', 'APIService'): KindInfo(
            model=k8s_client.V1beta1APIService,
            api_cls=k8s_client.ApiregistrationV1beta1Api,
            name='api_service',
        ),
        # }}}
        # /apis/batch/v1beta1/ {{{
        ('batch/v1beta1', 'CronJob'): KindInfo(
            model=k8s_client.V1beta1CronJob,
            api_cls=k8s_client.BatchV1beta1Api,
            name='namespaced_cron_job',
        ),
        # }}}
        # /apis/networking.k8s.io/v1beta1/ {{{
        ('networking.k8s.io/v1beta1', 'Ingress'): KindInfo(
            model=k8s_client.NetworkingV1beta1Ingress,
            api_cls=k8s_client.NetworkingV1beta1Api,
            name='namespaced_ingress'
        ),
        # }}}
        # /apis/policy/v1beta1/ {{{
        ('policy/v1beta1', 'PodSecurityPolicy'): KindInfo(
            model=k8s_client.PolicyV1beta1PodSecurityPolicy,
            api_cls=k8s_client.PolicyV1beta1Api,
            name='pod_security_policy',
        ),
        # }}}
        # /apis/rbac.authorization.k8s.io/v1/ {{{
        ('rbac.authorization.k8s.io/v1', 'ClusterRole'): KindInfo(
            model=k8s_client.V1ClusterRole,
            api_cls=k8s_client.RbacAuthorizationV1Api,
            name='cluster_role',
        ),
        ('rbac.authorization.k8s.io/v1', 'ClusterRoleBinding'): KindInfo(
            model=k8s_client.V1ClusterRoleBinding,
            api_cls=k8s_client.RbacAuthorizationV1Api,
            name='cluster_role_binding',
        ),
        ('rbac.authorization.k8s.io/v1', 'Role'): KindInfo(
            model=k8s_client.V1Role,
            api_cls=k8s_client.RbacAuthorizationV1Api,
            name='namespaced_role',
        ),
        ('rbac.authorization.k8s.io/v1', 'RoleBinding'): KindInfo(
            model=k8s_client.V1RoleBinding,
            api_cls=k8s_client.RbacAuthorizationV1Api,
            name='namespaced_role_binding',
        ),
        # }}}
        # /apis/rbac.authorization.k8s.io/v1beta1/ {{{
        ('rbac.authorization.k8s.io/v1beta1', 'ClusterRole'): KindInfo(
            model=k8s_client.V1beta1ClusterRole,
            api_cls=k8s_client.RbacAuthorizationV1beta1Api,
            name='cluster_role',
        ),
        ('rbac.authorization.k8s.io/v1beta1', 'ClusterRoleBinding'): KindInfo(
            model=k8s_client.V1beta1ClusterRoleBinding,
            api_cls=k8s_client.RbacAuthorizationV1beta1Api,
            name='cluster_role_binding',
        ),
        ('rbac.authorization.k8s.io/v1beta1', 'Role'): KindInfo(
            model=k8s_client.V1beta1Role,
            api_cls=k8s_client.RbacAuthorizationV1beta1Api,
            name='namespaced_role',
        ),
        ('rbac.authorization.k8s.io/v1beta1', 'RoleBinding'): KindInfo(
            model=k8s_client.V1beta1RoleBinding,
            api_cls=k8s_client.RbacAuthorizationV1beta1Api,
            name='namespaced_role_binding',
        ),
        # }}}
        # /apis/storage.k8s.io/v1/ {{{
        ('storage.k8s.io/v1', 'StorageClass'): KindInfo(
            model=k8s_client.V1StorageClass,
            api_cls=k8s_client.StorageV1Api,
            name='storage_class',
        ),
        # }}}
    }


# CustomResources cannot rely on statically declared models, which is why their
# management is treated differently from "standard" objects.

class CustomApiClient(ApiClient):
    CRUD_METHODS = dict(ApiClient.CRUD_METHODS, retrieve='get')

    def __init__(self, group, version, kind, plural, scope):
        self._group = group
        self._version = version
        self._scope = ObjectScope(scope)
        self._kind = kind
        self._plural = plural

        super(CustomApiClient, self).__init__(
            api_cls=k8s_apis.CustomObjectsApi,
            name='{}_custom_object'.format(self.scope.value)
        )

    group = property(operator.attrgetter('_group'))
    version = property(operator.attrgetter('_version'))
    scope = property(operator.attrgetter('_scope'))
    kind = property(operator.attrgetter('_kind'))
    plural = property(operator.attrgetter('_plural'))

    def _method(self, verb):
        """Return a CRUD method for this CustomApiClient.

        This is constructed as a partial application of the appropriate
        method from the `CustomObjectsApi`, and casts the resulting dict as
        a `CustomObject`.
        """
        base_method = super(CustomApiClient, self)._method(verb)

        def method(*args, **kwargs):
            kwargs.update({
                'group': self.group,
                'version': self.version,
                'plural': self.plural,
            })

            # Convert body to_dict if it's a CustomObject as
            # `python-kubernetes` want a dict or a specific objects with
            # some attributes like `openapi_types`, `attributes_map`, ...
            if isinstance(kwargs.get('body'), CustomObject):
                kwargs['body'] = kwargs['body'].to_dict()

            result = base_method(*args, **kwargs)

            if verb == 'list':
                return CustomObject({
                    'kind': '{}List'.format(self.kind),
                    'apiVersion': '{s.group}/{s.version}'.format(s=self),
                    'items': [CustomObject(obj) for obj in result],
                })

            # TODO: do we have a result for `delete` methods?
            return CustomObject(result)

        method.__doc__ = '{verb} a {kind} {scope} object.'.format(
            verb=verb.capitalize(),
            kind='{s.group}/{s.version}/{s.kind}'.format(s=self),
            scope=self.scope.value
        )

        return method


class CRKindInfo(object):
    """Equivalent of `KindInfo` for custom objects.

    Note that CRUD methods are partial applications of the `kubernetes.client`
    methods used to manipulate custom objects, using details from the
    statically provided information in `KNOWN_CUSTOM_KINDS`.
    """
    def __init__(self, api_version, kind, scope, plural):
        group, _, version = api_version.rpartition('/')
        if not (group and version):
            raise ValueError(
                "Malformed 'apiVersion': {} "
                "(expected format '<group>/<version>')".format(api_version)
            )

        self._api_version = api_version
        self._scope = scope
        self._client = CustomApiClient(
            group=group,
            version=version,
            kind=kind,
            plural=plural,
            scope=scope
        )
        self._kind = kind

    api_version = property(operator.attrgetter('_api_version'))
    kind = property(operator.attrgetter('_kind'))
    scope = property(operator.attrgetter('_scope'))
    client = property(operator.attrgetter('_client'))

    @property
    def key(self):
        # Used for indexing in `KNOWN_CUSTOM_KINDS`
        return (self.api_version, self.kind)


if HAS_LIBS:
    _CUSTOM_KINDS = [
        CRKindInfo('monitoring.coreos.com/v1', 'Alertmanager',
                   scope='namespaced', plural='alertmanagers'),
        CRKindInfo('monitoring.coreos.com/v1', 'Prometheus',
                   scope='namespaced', plural='prometheuses'),
        CRKindInfo('monitoring.coreos.com/v1', 'PrometheusRule',
                   scope='namespaced', plural='prometheusrules'),
        CRKindInfo('monitoring.coreos.com/v1', 'ServiceMonitor',
                   scope='namespaced', plural='servicemonitors'),
    ]

    KNOWN_CUSTOM_KINDS = {kind.key: kind for kind in _CUSTOM_KINDS}


class _DictWrapper(object):
    """Wrapper for dynamic attribute access support over a simple dict.

    Implemented by storing the dicts and overloading the `__getattribute__`
    to fallback on the internal `_fields` for retrieving an attribute and
    returning a `_DictWrapper` also overloading the `__setattr__` to being
    able to change a value from the origin dict.

    Used by `CustomObject` to emulate the other models for `kubernetes.client`.

    >>> example = _DictWrapper({
    ...     'a': {'b': 'value'},
    ...     'c': [{'subkey': 'subvalue'}]
    ... })
    >>> example.a.b
    'value'
    >>> example.c[0].subkey
    'subvalue'
    >>> example.unknown
    Traceback (most recent call last):
        ...
    AttributeError: Custom object has no attribute 'unknown'
    """
    def __init__(self, fields):
        self._fields = fields

    @classmethod
    def from_value(cls, value):
        if isinstance(value, dict):
            return cls(value)
        if isinstance(value, list):
            return [cls.from_value(val) for val in value]
        return value

    def to_dict(self):
        return self._fields

    def __repr__(self):
        return repr(self._fields)

    def __getattribute__(self, name):
        try:
            return super(_DictWrapper, self).__getattribute__(name)
        except AttributeError:
            if name in self._fields:
                return self.from_value(self._fields[name])
            for key in self._fields:
                if _convert_attribute_name(key) == name:
                    return self.from_value(self._fields[key])
            raise AttributeError(
                "Custom object has no attribute '{}'".format(name)
            )

    def __setattr__(self, name, value):
        # First check for class values then retrieve from dict
        if name in ['_fields']:
            super(_DictWrapper, self).__setattr__(name, value)
        else:
            self._fields[name] = value


class CustomObject(object):
    """Helper class to generate a "model" interface for CustomResources.

    The source manifest is converted to use snake case for all its keys and
    sub-keys, as is done in the `kubernetes.client`.

    This fake "model" also uses a `_DictWrapper` internally to provide dynamic
    attribute access on the instance's manifest.
    """
    def __init__(self, manifest):
        self._attr_dict = _DictWrapper(manifest)

    def to_dict(self):
        return self._attr_dict.to_dict()

    def to_str(self):
        return pformat(self.to_dict())

    def __repr__(self):
        return self.to_str()

    def __eq__(self, other):
        if not isinstance(other, CustomObject):
            return False

        return self.to_dict() == other.to_dict()

    def __getattribute__(self, name):
        try:
            return super(CustomObject, self).__getattribute__(name)
        except AttributeError:
            return getattr(self._attr_dict, name)

    def __setattr__(self, name, value):
        # First check for class values then retrieve from dict
        if name in ['_attr_dict']:
            super(CustomObject, self).__setattr__(name, value)
        else:
            setattr(self._attr_dict, name, value)


def get_kind_info(manifest):
    try:
        api_version = manifest['apiVersion']
        kind = manifest['kind']
    except KeyError:
        raise ValueError(
            'Make sure to provide a valid Kubernetes manifest, including'
            ' `kind` and `apiVersion` fields.'
        )

    # Check for custom Kinds first and then standard Kinds
    kind_info = KNOWN_CUSTOM_KINDS.get(
        (api_version, kind),
        KNOWN_STD_KINDS.get((api_version, kind))
    )

    if kind_info is None:
        raise ValueError(
            'Unknown object type provided: {}/{}. Make sure it is'
            ' registered properly.'.format(api_version, kind)
        )

    return kind_info


def convert_manifest_to_object(manifest, force_custom_object=False):
    """Convert a YAML representation of a K8s object to its Python model.

    This method can only convert known object kinds, as declared in the
    constants `KNOWN_STD_KINDS` or `KNOWN_CUSTOM_KINDS` in this module.

    It will also create the Python objects from sub-dicts when necessary before
    building the final result.

    In some case we need to force the use of `CustomObject` for example when
    we want an object but we don't have all the required field so we can not
    use the real Python kubernetes object. (e.g.: delete, get, update)
    """
    kind_info = get_kind_info(manifest)

    if force_custom_object or isinstance(kind_info, CRKindInfo):
        return CustomObject(manifest)

    return _build_standard_object(kind_info.model, manifest)


def _build_standard_object(model, manifest):
    """Construct an instance of `model` based on its `manifest`.

    This method assumes `model` to be a member of `kubernetes.client.models`,
    so that it can use its `attribute_map` and `openapi_types` attributes.
    """
    # `model.attribute_map` contain all attribute correspondance between
    # snake case and YAML style (camel case) so we need to reverse it
    # e.g.: {
    #   'status': 'status', 'kind': 'kind', 'spec': 'spec',
    #   'api_version': 'apiVersion', 'metadata': 'metadata'
    # }
    reverse_attr_map = {
        value: key for key, value in model.attribute_map.items()
    }

    kwargs = {}
    for src_key, src_value in manifest.items():
        key = reverse_attr_map.get(src_key, src_key)
        type_str = model.openapi_types.get(key)

        if type_str is None:
            raise ValueError(
                'Unsupported attribute {} for "{}" object.'.format(
                    src_key, model.__name__
                )
            )

        try:
            value = _cast_value(src_value, type_str)
        except TypeError as exc:
            raise ValueError(
                'Invalid value for attribute {} of a "{}" object: {}.'.format(
                    src_key, model.__name__, str(exc)
                )
            )

        kwargs[key] = value

    return model(**kwargs)


DICT_PATTERN = re.compile(r'^dict\(str,\s?(?P<value_type>\S+)\)$')
LIST_PATTERN = re.compile(r'^list\[(?P<value_type>\S+)\]$')


def _cast_value(value, type_string):
    """Attempt to cast a value given a type declaration as a string.

    Used exclusively by `_build_standard_object`, relying on the models
    `openapi_types` declarations for converting manifests into Python objects.
    """
    # Special case for None used for exemple when patching to remove key
    if value is None:
        return value

    if type_string == 'str':
        if not isinstance(value, six.string_types):
            raise _type_error(value, expected='a string')
        return value

    if type_string == 'bool':
        if not isinstance(value, bool):
            raise _type_error(value, expected='a boolean')
        return value

    if type_string == 'int':
        if not isinstance(value, six.integer_types):
            raise _type_error(value, expected='an integer')
        return value

    if type_string == 'float':
        if not isinstance(value, six.integer_types + (float,)):
            raise _type_error(value, expected='a float')
        return float(value)

    if type_string == 'object':
        # NOTE: this corresponds to fields accepting different types, such as
        # either string or integer (e.g. for ports or thresholds). As such, we
        # don't attempt validation. Note however that some cases may require
        # casting into specific objects, which we don't handle yet.
        return value

    if type_string == 'datetime':
        # YAML only supports dates as strings, though we don't know in advance
        # what format would be used in source manifests (most likely, there
        # wouldn't be any date). We thus pick the Swagger `date-time` string
        # format (see swagger.io/docs/specification/data-models/data-types/).
        try:
            return datetime.datetime.strptime(value, '%Y-%m-%dT%H:%M:%SZ')
        except (TypeError, ValueError):
            raise _type_error(value, expected='a date-time string')

    dict_match = DICT_PATTERN.match(type_string)
    if dict_match is not None:
        if not isinstance(value, dict):
            raise _type_error(value, expected='a dictionary')

        if not all(isinstance(key, six.string_types) for key in value.keys()):
            raise _type_error(value,
                              expected='a dictionary with string keys only')

        value_type_str = dict_match.group('value_type')
        return {
            key: _cast_value(val, value_type_str)
            for key, val in value.items()
        }

    list_match = LIST_PATTERN.match(type_string)
    if list_match is not None:
        if not isinstance(value, list):
            raise _type_error(value, expected='a list')

        value_type_str = list_match.group('value_type')
        return [_cast_value(val, value_type_str) for val in value]

    try:
        model = getattr(k8s_client.models, type_string)
    except AttributeError:
        # This should never happen, otherwise this function should get updated
        raise ValueError(
            'Unknown type string provided: {}.'.format(type_string)
        )

    if not isinstance(value, dict):
        raise _type_error(
            value,
            expected='a dict to cast as a "{}"'.format(model.__name__)
        )

    return _build_standard_object(model, value)


def _type_error(value, expected):
    return TypeError(
        'Expected {}, received: {} (type: {})'.format(
            expected, value, type(value)
        )
    )


def validate_manifest(manifest):
    """Ensure a Kubernetes object is strictly conformant to its OpenAPI schema.

    This method relies on the K8s client models, which are generated from said
    schema. The approach is to cast the original `manifest` dict into such
    models, and then obtain the dict representation from the model back again,
    ensuring that nothing is lost from the original manifest (the conversion
    also checks that no "unsupported" field is provided).

    For CustomResources, this only checks that the apiVersion and kind are
    registered in this file.
    """
    obj = convert_manifest_to_object(manifest)
    result = obj.to_dict()

    # We use the same logic as `kubernetes.client` for converting attribute
    # names.
    desired = _cast_dict_keys(manifest, key_cast=_convert_attribute_name)

    # We only check fields provided in the source, since the conversion
    # may add empty or default values for optional fields
    dictdiff = recursive_diff(desired, result)
    return not dictdiff.removed() and not dictdiff.changed()


def _cast_dict_keys(data, key_cast):
    """Converts all dict keys in `data` using `key_cast`, recursively.

    Can be used on any type, as this method will apply itself on dict and list
    members, otherwise behaving as no-op.

    >>> _cast_dict_keys({'key': 'value', 'other': {'a': 'b'}}, str.capitalize)
    {'Key': 'value', 'Other': {'A': 'b'}}
    >>> _cast_dict_keys(['1', '2', {'3': '4'}], int)
    ['1', '2', {3: '4'}]
    >>> _cast_dict_keys(({'a': 1}, {'b': 2}), str.capitalize)
    ({'a': 1}, {'b': 2})
    >>> _cast_dict_keys(1, str.capitalize)
    1
    """
    if isinstance(data, dict):
        return {
            key_cast(key): _cast_dict_keys(value, key_cast)
            for key, value in data.items()
        }

    if isinstance(data, list):
        return [_cast_dict_keys(value, key_cast) for value in data]

    return data


def _convert_attribute_name(key):
    """Translation of attribute names from K8s YAML style to Python snake case.

    Supports all special values present in the `kubernetes.client.models`.
    Note the last example, where the conversion yields an unexpected result.
    This is actually what is done in the source code of `V1ServiceSpec`, and
    the same behaviour exists in other models.

    Python keywords are also prefixed with an underscore.

    >>> _convert_attribute_name('kind')
    'kind'
    >>> _convert_attribute_name('apiVersion')
    'api_version'
    >>> _convert_attribute_name('JSONPath')
    'json_path'
    >>> _convert_attribute_name('volumeID')
    'volume_id'
    >>> _convert_attribute_name('continue')  # Python keyword
    '_continue'
    >>> _convert_attribute_name('$ref')  # Remove '$' prefix
    'ref'
    >>> _convert_attribute_name('openAPIV3Schema')  # Numbers count as caps
    'open_apiv3_schema'
    >>> _convert_attribute_name('externalIPs')  # Weird result...
    'external_i_ps'
    """
    if keyword.iskeyword(key):
        return '_{}'.format(key)
    if key.startswith('$'):
        # Only two supported values, '$ref' and '$schema'
        return key[1:]
    for pattern in ['([a-z])([A-Z0-9])', '([A-Z0-9])([A-Z0-9][a-z])']:
        key = re.sub(pattern, r'\1_\2', key)
    return key.lower()


def camel_to_snake(source):
    """Translation of attribute names from K8s YAML style to Python snake case.
    """
    return _cast_dict_keys(source, _convert_attribute_name)
