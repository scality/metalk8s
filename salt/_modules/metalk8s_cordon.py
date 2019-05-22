'''
Module for cordoning and uncordoning a Kubernetes node.

This module's functions are merged into the `metalk8s_kubernetes`
module when called by salt by virtue of its `__virtualname__` attribute.
'''
import logging

from salt.exceptions import CommandExecutionError

try:
    import kubernetes
    import kubernetes.client
    from kubernetes.client.rest import ApiException
    from urllib3.exceptions import HTTPError

    HAS_LIBS = True
except ImportError:
    HAS_LIBS = False

log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s_kubernetes'


def __virtual__():
    '''
    Check dependencies
    '''
    if HAS_LIBS:
        return __virtualname__

    return False, 'python kubernetes library not found'


def node_unschedulable(node_name, **kwargs):
    '''
    Return unschedulable value of the node identified by the specified name

    CLI Examples::

        salt '*' kubernetes.node_unschedulable node_name="minikube"
    '''
    match = __salt__['metalk8s_kubernetes.node'](node_name, **kwargs)

    if match is not None:
        return match['spec']['unschedulable'] or False

    return None


def node_set_unschedulable(node_name, unschedulable, **kwargs):
    '''
    Update the unschedulable flag to the provided `unschedulable` value for the
    node identified by the name `node_name`.

    CLI Examples::

        # To cordon a node
        salt '*' kubernetes.node_set_unschedulable node_name="minikube" \
            unschedulable=True

        # To uncordon a node
        salt '*' kubernetes.node_set_unschedulable node_name="minikube" \
            unschedulable=False
    '''
    cfg = __salt__['metalk8s_kubernetes.setup_conn'](**kwargs)
    try:
        api_instance = kubernetes.client.CoreV1Api()
        body = {'spec': {'unschedulable': unschedulable}}
        api_response = api_instance.patch_node(node_name, body)
        return api_response.to_dict()
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None
        else:
            log.exception('Exception when calling CoreV1Api->patch_node')
            raise CommandExecutionError(exc)
    finally:
        __salt__['metalk8s_kubernetes.cleanup'](**cfg)


def node_cordon(node_name, **kwargs):
    '''
    Cordon a node (set unschedulable to True)

    CLI Examples::

        salt '*' kubernetes.node_cordon  node_name="minikube"
    '''
    return node_set_unschedulable(node_name, True, **kwargs)


def node_uncordon(node_name, **kwargs):
    '''
    Uncordon a node (set unschedulable to False)

    CLI Examples::

        salt '*' kubernetes.node_uncordon  node_name="minikube"
    '''
    return node_set_unschedulable(node_name, False, **kwargs)
