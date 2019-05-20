'''
Module for draining a Kubernetes node.

This implementation is based on the go code of `kubectl`, for more details see
https://github.com/kubernetes/kubernetes/blob/v1.11.10/pkg/kubectl/cmd/drain.go

This module's functions are merged into the `metalk8s_kubernetes`
module when called by salt by virtue of its `__virtualname__` attribute.
'''

import logging
import operator
import time

from salt.exceptions import CommandExecutionError

try:
    import kubernetes
    import kubernetes.client
    from kubernetes.client.rest import ApiException
    from kubernetes.client.models.v1_delete_options import V1DeleteOptions
    from kubernetes.client.models.v1_object_meta import V1ObjectMeta
    from kubernetes.client.models.v1beta1_eviction import V1beta1Eviction
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


class DrainException(Exception):
    '''General purpose drain exception.'''

    def __init__(self, message):
        super(DrainException, self).__init__()
        self.message = message

    def __str__(self):
        return '<{0}> {1}'.format(str(self.__class__), self.message)


class DrainTimeoutException(DrainException):
    '''Timeout-specific drain exception.'''
    pass


def _mirrorpod_filter(pod):
    '''Check if a pod contains the mirror K8s annotation.

    Args:
      - pod: kubernetes pod object
    Returns: True if the pod has the mirror annotation, False if not
    '''
    mirror_annotation = "kubernetes.io/config.mirror"

    annotations = pod.metadata.annotations
    if annotations and mirror_annotation in annotations:
        return False, ""
    return True, ""


def _has_local_storage(pod):
    '''Check if a pod has local storage.

    Args:
      - pod: kubernetes pod object
    Returns: True if the pod uses local storage, False if not
    '''
    for volume in pod.spec.volumes:
        if volume.empty_dir is not None:
            return True
    return False


def _get_controller_of(pod):
    '''Get a pod's controller's reference.

    This uses the pod's metadata, so there is no guarantee that
    the controller object reference returned actually corresponds to a
    controller object in the Kubernetes API.

    Args:
      - pod: kubernetes pod object
    Returns: the reference to a controller object
    '''
    if pod.metadata.owner_references:
        for owner_ref in pod.metadata.owner_references:
            if owner_ref.controller:
                return owner_ref
    return None


def _message_from_pods_dict(errors_dict):
    '''Form a message string from a 'pod kind': [pod name...] dict.

    Args:
      - errors_dict: a dict with keys pod kinds as string and values
                     names of pods of that kind
    Returns: a string message
    '''
    msg_list = [
        "{0}: {1}".format(key, ", ".join(msg))
        for key, msg in errors_dict.items()
    ]
    return "; ".join(msg_list)


def _get_pod_from_namespace(namespace, name):
    '''Retrieve pod object from namespace.

    Args:
      - namespace: pod's namespace
      - name: pod's name
    Returns: the Kubernetes API pod object.
    Raises:  CommandExecutionError in case of unexpected API error.
    '''
    try:
        api_instance = kubernetes.client.CoreV1Api()
        api_response = api_instance.list_namespaced_pod(
            namespace=namespace,
            field_selector='metadata.name={0}'.format(name)
        )
        return api_response
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException) and exc.status == 404:
            return None

        log.exception(
            'Exception when calling '
            'CoreV1Api->list_namespaced_pod')
        raise CommandExecutionError(exc)


# pod statuses
POD_STATUS_SUCCEEDED = "Succeeded"
POD_STATUS_FAILED = "Failed"


class Drain(object):
    '''The drain object class.

    This object contains the options associated to a drain request on a
    given node, as well as the methods used to execute the drain.
    '''

    # According to `kubectl` code, this value should be 1 second by default
    KUBECTL_INTERVAL = 1
    WARNING_MSG = {
        "daemonset": "Ignoring DaemonSet-managed pods",
        "localStorage": "Deleting pods with local storage",
        "unmanaged": (
            "Deleting pods not managed by ReplicationController, "
            "ReplicaSet, Job, DaemonSet or StatefulSet")
    }

    FATAL_MSG = {
        "daemonset": "DaemonSet-managed pods",
        "localStorage": "pods with local storage",
        "unmanaged": (
            "pods not managed by ReplicationController, "
            "ReplicaSet, Job, DaemonSet or StatefulSet")
    }

    def __init__(self,
                 node_name,
                 force=False,
                 grace_period=1,
                 ignore_daemonset=False,
                 timeout=0,
                 delete_local_data=False):
        self._node_name = node_name
        self._force = force
        self._grace_period = grace_period
        self._ignore_daemonset = ignore_daemonset
        self._timeout = timeout or (2 ** 64 - 1)
        self._delete_local_data = delete_local_data

    node_name = property(operator.attrgetter('_node_name'))
    force = property(operator.attrgetter('_force'))
    grace_period = property(operator.attrgetter('_grace_period'))
    ignore_daemonset = property(operator.attrgetter('_ignore_daemonset'))
    timeout = property(operator.attrgetter('_timeout'))
    delete_local_data = property(operator.attrgetter('_delete_local_data'))

    def localstorage_filter(self, pod):
        '''Compute eviction status for the pod according to local storage.

        Args:
          - pod: the pod for which eviction is computed
        Return: (is_deletable: bool, warning: str)
        Raises: DrainException if deleting local data is not possible
        '''
        if not _has_local_storage(pod):
            return True, ""
        if not self.delete_local_data:
            raise DrainException(self.FATAL_MSG["localStorage"])
        return True, self.WARNING_MSG["localStorage"]

    def unreplicated_filter(self, pod):
        '''Compute eviction status for the pod according to replication.

        Args:
          - pod: the pod for which eviction is computed
        Returns: (is_deletable: bool, warning: str)
        Raises: DrainException if the pod has no controller and the `force`
                option was not provided.
        '''
        # finished pods can be removed
        if pod.status.phase in (POD_STATUS_SUCCEEDED, POD_STATUS_FAILED):
            return True, ""

        try:
            controller_ref = self.get_pod_controller(pod)
        # DrainException triggered if the reference has no corresponding
        # object in the apiserver.
        except DrainException:
            if self.force:
                controller_ref = None
            else:
                raise
        if controller_ref is not None:
            return True, ""
        return True, self.WARNING_MSG["unmanaged"]

    @staticmethod
    def get_controller(namespace, controller_ref):
        '''Get the controller object from a reference to it

        Args:
          - namespace: the queried controller's namespace
          - controller_ref: the queried controller's reference
        Returns:
          - the controller object if found
          - None if not found
        Raises: CommandExecutionError if API fails
        '''
        API_CONTROLLERS = {
            "ReplicationController": {
                "call": "CoreV1Api->list_namespaced_replication_controller",
                "api_source": kubernetes.client.CoreV1Api,
                "api_operation": "list_namespaced_replication_controller"
            },
            "DaemonSet": {
                "call": "ExtensionsV1beta1Api->list_namespaced_daemon_set",
                "api_source": kubernetes.client.ExtensionsV1beta1Api,
                "api_operation": "list_namespaced_daemon_set"
            },
            "Job": {
                "call": "CoreV1Api->list_namespaced_cron_job",
                "api_source": kubernetes.client.BatchV1beta1Api,
                "api_operation": "list_namespaced_cron_job"
            },
            "ReplicaSet": {
                "call": "CoreV1Api->list_namespaced_replica_set",
                "api_source": kubernetes.client.ExtensionsV1beta1Api,
                "api_operation": "list_namespaced_replica_set"
            },
            "StatefulSet": {
                "call": "CoreV1Api->list_namespaced_stateful_set",
                "api_source": kubernetes.client.ExtensionsV1beta1Api,
                "api_operation": "list_namespaced_stateful_set"
            }
        }

        api_data = API_CONTROLLERS.get(controller_ref.kind)
        if api_data is None:
            raise CommandExecutionError(
                "Unknown controller kind '{0}'".format(controller_ref.kind))

        api_call = api_data["call"]
        api_instance = api_data["api_source"]()

        try:
            return getattr(
                api_instance,
                api_data["api_operation"]
            )(
                namespace=namespace,
                field_selector='metadata.name={0}'.format(controller_ref.name)
            )
        except (ApiException, HTTPError) as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                return None

            log.exception('Exception when calling %s', api_call)
            raise CommandExecutionError(str(exc))

    def get_pod_controller(self, pod):
        '''Get a pod's controller object reference

        Args:
          - pod: the pod for which we want the controller
        Returns: the pod's controller reference if the controller exists
        Raises: DrainException if the controller matching the referenct is
                not found
        '''
        controller_ref = _get_controller_of(pod)
        if controller_ref is None:
            return None
        response = self.get_controller(pod.metadata.namespace, controller_ref)
        if self.not_found(response):
            raise DrainException(
                "Missing pod controller for '{0}'".format(controller_ref.name)
            )
        return controller_ref

    def daemonset_filter(self, pod):
        '''Compute eviction status for the pod according to DaemonSet kind.

        A daemonset will generally not be deleted, regardless of flags, but we
        can determine if their presence constitutes an error.

        The exception to this rule is when the pod is orphaned, meaning that
        the management resource is not found, and we have the `force` flag set.

        Returns: (is_deletable: bool, warning: str)
        Raises: DrainException if the DaemonSet is in unexpected state and the
                `ignore_daemonset` option was not set
        '''
        controller_ref = _get_controller_of(pod)

        if controller_ref is None or controller_ref.kind != "DaemonSet":
            return True, ""

        controller = self.get_controller(pod.metadata.namespace, controller_ref)

        if self.not_found(controller):
            if self.force:
                # Not found and forcing: remove orphan pods with warning
                return (
                    True,
                    "Default to deletable on pod with no controller found"
                )

            raise DrainException(
                "Missing pod controller for '{0}'".format(controller_ref.name)
            )

        if not self.ignore_daemonset:
            raise DrainException(self.FATAL_MSG["daemonset"])

        return False, self.WARNING_MSG["daemonset"]

    def get_pods_for_eviction(self):
        '''Compute node drain status according to deletable pods.'''
        warnings = {}
        failures = {}
        pods = []

        try:
            api_instance = kubernetes.client.CoreV1Api()
            api_response = api_instance.list_pod_for_all_namespaces(
                field_selector='spec.nodeName={0}'.format(self.node_name)
            )
        except (ApiException, HTTPError) as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                return []
            log.exception(
                'Exception when calling '
                'CoreV1Api->list_pod_for_all_namespaces')
            raise CommandExecutionError(exc)

        for pod in api_response.items:
            is_deletable = True
            for pod_filter in (
                    _mirrorpod_filter,
                    self.localstorage_filter,
                    self.unreplicated_filter,
                    self.daemonset_filter
            ):
                try:
                    filter_deletable, warning = pod_filter(pod)
                except DrainException as exc:
                    failures.setdefault(
                        exc.message, []).append(pod.metadata.name)

                if warning:
                    warnings.setdefault(
                        warning, []).append(pod.metadata.name)
                is_deletable &= filter_deletable
            if is_deletable:
                pods.append(pod)

        if failures:
            raise DrainException(_message_from_pods_dict(failures))
        if warnings:
            log.warning("WARNING: %s", _message_from_pods_dict(warnings))
        return pods

    def run_drain(self, dry_run=False):
        '''Drain the targeted node.

        In practice, we check the node for unevictable pods according to
        the passed options, and evict the pod if and only if all pods on
        the node are evictable.

        Args:
          - dry_run: dry run mode, where evictable pods will be computed
                     but no eviction will be triggered.
        Returns: string message
        Raises: CommandExecutionError in case of timeout or eviction failure
        '''
        try:
            pods = self.get_pods_for_eviction()
        except DrainException as exc:
            raise CommandExecutionError(
                (
                    "The following are not deletable: {0}. "
                    "You can ignore DaemonSet pods with the "
                    "ignore_daemonset flag."
                ).format(
                    exc.message
                )
            )

        if dry_run:
            return "Prepared for eviction of pods: {0}".format(
                ", ".join(pods) if pods else "no pods to evict."
            )

        try:
            self.evict_pods(pods)
        except DrainTimeoutException as exc:
            remaining_pods = self.get_pods_for_eviction()
            raise CommandExecutionError(
                "{0} List of remaining pods to follow".format(exc.message),
                [pod.metadata.name for pod in remaining_pods]
            )
        except CommandExecutionError as exc:
            remaining_pods = self.get_pods_for_eviction()
            raise CommandExecutionError(
                "{0} List of remaining pods to follow".format(
                    exc.message
                ),
                [pod.metadata.name for pod in remaining_pods]
            )
        return "Eviction complete."

    def evict_pods(self, pods):
        '''Trigger the eviction process for all pods passed.

        Args:
          - pods: list of Kubernetes API pods to evict
        Returns: None
        Raises: DrainTimeoutException if the eviction process is not complete
                after the specified timeout value
        '''
        for pod in pods:
            # TODO: "too many requests" error not handled
            _ = self.evict_pod(pod)

        pending = self.wait_for_eviction(pods)

        if pending:
            raise DrainTimeoutException(
                "Drain did not complete within {0}".format(self.timeout)
            )

    @staticmethod
    def not_found(response):
        '''Check whether a K8s API response indicates a resource not found.'''
        return response is None or len(response.items) == 0

    def wait_for_eviction(self, pods):
        '''Wait for pods deletion.

        Args:
          - pods: the list of pods on which eviction was triggered, for which
                  we wait until they are no longer present in API queries.
        Returns: the list of remaining pods after timeout
        '''
        total_t = 0
        while total_t < self.timeout and pods:
            pending = []
            iteration_start = time.time()    # For time processing pods
            for pod in pods:
                response = _get_pod_from_namespace(
                    pod.metadata.namespace, pod.metadata.name
                )
                if (
                    self.not_found(response) or
                    response.items[0].metadata.uid != pod.metadata.uid
                ):
                    log.info("%s evicted", pod.metadata.name)
                else:
                    pending.append(pod)
            iteration_duration = time.time() - iteration_start
            pods = pending
            if pods and iteration_duration < self.KUBECTL_INTERVAL:
                time.sleep(self.KUBECTL_INTERVAL - iteration_duration)
            total_t += time.time() - iteration_start
        return pods

    def evict_pod(self, pod):
        '''Trigger the eviction process for a single pod.

        Args:
          - pod: the Kubernetes API pod object to evict
        Returns: None
        Raises: CommandExecutionError in case of API error
        '''
        delete_options = V1DeleteOptions()
        if self.grace_period >= 0:
            delete_options.grace_period = self.grace_period

        object_meta = V1ObjectMeta(
            name=pod.metadata.name,
            namespace=pod.metadata.namespace)

        eviction = V1beta1Eviction(
            delete_options=delete_options,
            metadata=object_meta,
        )

        api_call = "CoreV1Api->create_namespaced_pod_eviction"
        api_instance = kubernetes.client.CoreV1Api()
        try:
            return api_instance.create_namespaced_pod_eviction(
                name=eviction.metadata.name,
                namespace=eviction.metadata.namespace,
                body=eviction,
            )
        except (ApiException, HTTPError) as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                return None

            log.exception('Exception when calling %s', api_call)
            raise CommandExecutionError(exc)


def node_drain(node_name,
               force=False,
               grace_period=1,
               ignore_daemonset=False,
               timeout=0,
               delete_local_data=False,
               dry_run=False,
               **kwargs):
    '''Trigger the drain process for a node.

    Args:
      - force             : ignore unreplicated pods (i.e. StaticPod pods)
      - grace_period      : eviction grace period
      - ignore_daemonset  : ignore daemonsets in eviction process
      - timeout           : drain process timeout value
      - delete_local_data : force deletion for pods with local storage
      - dry_run           : only run pod selection process, not eviction

    Keyword args: connection parameters, passed through to connection utility
                  module.
    Returns: None
    Raises: CommandExecutionError if the drain process was unsuccessful/
    '''

    cfg = __salt__['metalk8s_kubernetes.setup_conn'](**kwargs)
    drainer = Drain(
        node_name,
        force=force,
        grace_period=grace_period,
        ignore_daemonset=ignore_daemonset,
        timeout=timeout,
        delete_local_data=delete_local_data
    )
    __salt__['metalk8s_kubernetes.node_cordon'](node_name, **kwargs)
    try:
        result = drainer.run_drain(dry_run=dry_run, **kwargs)
    # CommandExecutionError should fall through, but we want cleanup regardless
    except CommandExecutionError:
        raise
    finally:
        __salt__['metalk8s_kubernetes.cleanup'](**cfg)
