'''
A renderer for Kubernetes YAML manifests

Given a Kubernetes YAML file (which may be a stream of objects, i.e. YAML
snippets separated by `---` lines), this will render an SLS which calls Salt
`*_present` states for every such object.

To use it, add a shebang like `#!kubernetes` as the first line of your manifests
SLS file. Optionally, you can use rendering pipelines (if templating is
required), e.g. `#!jinja | kubernetes`.
'''

import yaml

import salt.utils.yaml
from salt.utils.odict import OrderedDict

from salt.ext import six

__virtualname__ = 'kubernetes'


def __virtual__():
    return __virtualname__


def _step_name(obj):
    namespace = obj['metadata'].get('namespace')

    if namespace:
        name = '{}/{}'.format(
            namespace,
            obj['metadata']['name'],
        )
    else:
        name = obj['metadata']['name']

    return "Apply {}/{} '{}'".format(
        obj['apiVersion'],
        obj['kind'],
        name,
    )


_HANDLERS = {}

def handle(api_version, kind):
    '''
    Register a 'handler' (object -> state mapping) for `apiVersion` and `kind`
    '''
    tag = (api_version, kind)

    def register(f):
        assert tag not in _HANDLERS

        _HANDLERS[tag] = f

        return f

    return register


@handle('v1', 'Service')
def _handle_v1_service(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.service_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'namespace': obj['metadata']['namespace']},
            {'metadata': obj['metadata']},
            {'spec': obj['spec']},
        ],
    }


@handle('v1', 'ServiceAccount')
def _handle_v1_serviceaccount(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.serviceaccount_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'namespace': obj['metadata']['namespace']},
        ],
    }


@handle('v1', 'ConfigMap')
def _handle_v1_configmap(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.configmap_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'namespace': obj['metadata']['namespace']},
            {'data': obj['data']},
        ],
    }


@handle('apiextensions.k8s.io/v1beta1', 'CustomResourceDefinition')
def _handle_apiextensions_v1beta1_customresourcedefinition(
        obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.customresourcedefinition_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'spec': obj['spec']},
        ],
    }


@handle('rbac.authorization.k8s.io/v1', 'ClusterRole')
@handle('rbac.authorization.k8s.io/v1beta1', 'ClusterRole')
def _handle_rbac_v1beta1_clusterrole(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.clusterrole_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'rules': obj['rules']},
        ],
    }


@handle('rbac.authorization.k8s.io/v1', 'ClusterRoleBinding')
@handle('rbac.authorization.k8s.io/v1beta1', 'ClusterRoleBinding')
def _handle_rbac_v1beta1_clusterrolebinding(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.clusterrolebinding_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'role_ref': obj['roleRef']},
            {'subjects': obj['subjects']},
        ],
    }


@handle('rbac.authorization.k8s.io/v1', 'Role')
def _handle_rbac_v1beta1_role(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.role_present': [
            {'name': obj['metadata']['name']},
            {'namespace': obj['metadata']['namespace']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'rules': obj['rules']},
        ],
    }


@handle('rbac.authorization.k8s.io/v1', 'RoleBinding')
def _handle_rbac_v1beta1_rolebinding(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.rolebinding_present': [
            {'name': obj['metadata']['name']},
            {'namespace': obj['metadata']['namespace']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'role_ref': obj['roleRef']},
            {'subjects': obj['subjects']},
        ],
    }


@handle('extensions/v1beta1', 'DaemonSet')
def _handle_extensions_v1beta1_daemonset(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.daemonset_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'namespace': obj['metadata']['namespace']},
            {'metadata': obj['metadata']},
            {'spec': obj['spec']},
        ],
    }


@handle('apps/v1beta2', 'Deployment')
@handle('extensions/v1beta1', 'Deployment')
def _handle_extensions_v1beta1_deployment(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.deployment_present': [
            {'name': obj['metadata']['name']},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'namespace': obj['metadata']['namespace']},
            {'metadata': obj['metadata']},
            {'spec': obj['spec']},
        ],
    }


@handle('v1', 'Namespace')
def _handle_v1_namespace(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.namespace_present': [
            {'name': obj['metadata']['name']},
            {'body': obj},
            {'kubeconfig': kubeconfig},
            {'context': context},
        ],
    }


@handle('v1', 'Secret')
def _handle_v1_secret(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.secret_present': [
            {'name': obj['metadata']['name']},
            {'namespace': obj['metadata']['namespace']},
            {'data': obj['data']},
            {'kubeconfig': kubeconfig},
            {'context': context},
        ],
    }


@handle('monitoring.coreos.com/v1', 'Alertmanager')
@handle('monitoring.coreos.com/v1', 'Prometheus')
@handle('monitoring.coreos.com/v1', 'PrometheusRule')
@handle('monitoring.coreos.com/v1', 'ServiceMonitor')
def _handle_monitoring_coreos_com_v1_customresource(obj, kubeconfig, context):
    return {
        'metalk8s_kubernetes.customresource_present': [
            {'name': obj['metadata']['name']},
            {'body': obj},
            {'kubeconfig': kubeconfig},
            {'context': context},
            {'namespace': obj['metadata']['namespace']},
        ],
    }


del handle


def _step(obj, kubeconfig=None, context=None):
    '''
    Handle a single Kubernetes object, rendering it into a state 'step'
    '''
    name = _step_name(obj)
    api_version = obj['apiVersion']
    kind = obj['kind']

    handler = _HANDLERS.get((api_version, kind))
    if not handler:
        raise ValueError('No handler for {}/{}'.format(api_version, kind))

    state = handler(obj, kubeconfig=kubeconfig, context=context)

    return (name, state)


def render(yaml_data, saltenv='', sls='', **kwargs):
    args = six.moves.urllib.parse.parse_qs(kwargs.get('argline', ''))

    kubeconfig = args.get('kubeconfig', [None])[0]
    context = args.get('context', [None])[0]

    if not isinstance(yaml_data, six.string_types):
        yaml_data = yaml_data.read()

    data = yaml.load_all(yaml_data, Loader=salt.utils.yaml.SaltYamlSafeLoader)

    objects = []
    for obj in data:
        if not obj:
            continue
        if isinstance(obj.get('items'), list):
            objects.extend(obj['items'])
        else:
            objects.append(obj)

    return OrderedDict(
        _step(obj, kubeconfig=kubeconfig, context=context)
        for obj in objects
    )
