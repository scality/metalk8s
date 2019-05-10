import logging
import operator
import time

from salt.exceptions import CommandExecutionError

import metalk8s_cordon
import metalk8s_kubernetes

try:
    import kubernetes  # pylint: disable=import-self
    import kubernetes.client
    from kubernetes.client.rest import ApiException
    from urllib3.exceptions import HTTPError
    from kubernetes.client.models.v1_delete_options import V1DeleteOptions
    from kubernetes.client.models.v1_object_meta import V1ObjectMeta
    from kubernetes.client.models.v1beta1_eviction import V1beta1Eviction

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
        print(self.message)


class DrainTimeoutException(DrainException):
    '''Timeout-specific drain exception.'''
    pass


def _mirrorpod_filter(pod):
    '''Check if a pod contains the mirror K8s annotation.'''
    mirror_annotation = "kubernetes.io/config.mirror"

    annotations = pod.metadata.annotations
    if annotations and mirror_annotation in annotations:
        return False, ""
    return True, ""


def _has_local_storage(pod):
    '''Check if a pod has local storage.'''
    for volume in pod.spec.volumes:
        if volume.empty_dir is not None:
            return True
    return False


def _get_controller_of(pod):
    '''Get a pod's controller's reference.'''
    if pod.metadata.owner_references:
        for owner_ref in pod.metadata.owner_references:
            if owner_ref.controller:
                return owner_ref
    return None


# pod statuses
POD_STATUS_SUCCEEDED = "Succeeded"
POD_STATUS_FAILED = "Failed"


class Drain(object):
    '''The drain object class.

    This object contains the options associated to a drain request on a
    given node, as well as the methods used to execute the drain.
    '''
    # TODO: this is random value...
    #       kubectl uses `kubectl.interval`, but cannot find it anywhere
    KUBECTL_INTERVAL = 10
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
        '''Check if given pod can be elected for deletion,
        regarding local storage

        return: (deletable: bool, warning: str)
        raises: DrainException if deleting local data is not possible
        '''
        if not _has_local_storage(pod):
            return True, ""
        if not self._delete_local_data:
            raise DrainException(self.FATAL_MSG["localStorage"])
        return True, self.WARNING_MSG["localStorage"]

    def unreplicated_filter(self, pod):
        '''Check if given pod can be elected for deletion,
        regarding replication

        return: (deletable flag, warning msg, fatal msg)
        '''
        # finished pods can be removed
        if pod.status.phase in (POD_STATUS_SUCCEEDED, POD_STATUS_FAILED):
            return True, None, None

        try:
            controller_ref = self.get_pod_controller(pod)
        except DrainException as exc:
            raise
        if controller_ref is not None:
            return True, ""
        if not self.force:
            raise DrainException(self.FATAL_MSG["unmanaged"])
        return True, self.WARNING_MSG["unmanaged"]

    def get_controller(self, namespace, controller_ref):
        '''Get the controller object from a reference to it

        return:
          - the controller object if found
          - None if not found
        raises: CommandExecutionError if API fails
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
            raise CommandExecutionError(exc)

    def get_pod_controller(self, pod):
        '''Get a pod's controller object reference

        return: controller
        raises: DrainException if controller not found
        '''
        controller_ref = _get_controller_of(pod)
        if controller_ref is None:
            return None
        # Fire error if - and only if - controller is gone/missing...
        # TODO: Is it done
        #   1) by api call that fires error when nothing is found,
        #   2) by checking err/warning message and take action?
        #   3) when reponse.items is empty?
        #   Note: taking option 3...
        response = self.get_controller(pod.metadata.namespace, controller_ref)
        if self.not_found(response):
            raise DrainException(
                "Missing pod controller for '{0}'".format(controller_ref.name)
            )
        return controller_ref

    def daemonset_filter(self, pod):
        '''Check if given pod can be elected for deletion daemonset-wise.

        A daemonset will generally not be deleted, regardless of flags, but we
        can determine if their presence constitutes an error.

        The exception to this rule is when the pod is orphaned, meaning that
        the management resource is not found, and we have the `force` flag set.

        return: (deletable: bool, warn: str)
        raises: DrainException if daemonset is in unexpected state
        '''
        controller_ref = _get_controller_of(pod)

        if controller_ref is None or controller_ref.kind != "DaemonSet":
            return True, ""

        controller = self.get_controller(pod.metadata.namespace, controller_ref)

        if self.not_found(controller):
            if self._force:
                # Not found and forcing: remove orphan pods with warning
                return (
                    True,
                    "Default to deletable on pod with no controller found"
                )

            raise DrainException(
                "Missing pod controller for '{0}'".format(controller_ref.name)
            )

        if not self._ignore_daemonset:
            raise DrainException(self.FATAL_MSG["daemonset"])

        return False, self.WARNING_MSG["daemonset"]

    def get_pods_for_eviction(self):
        '''Get list of pods that can be deleted/evicted on
        node identified by the name `node_name`.
        '''
        warnings = {}
        failures = {}
        pods = []

        try:
            api_instance = kubernetes.client.CoreV1Api()
            api_response = api_instance.list_pod_for_all_namespaces(
                field_selector='spec.nodeName={0}'.format(self._node_name)
            )
        except (ApiException, HTTPError) as exc:
            if isinstance(exc, ApiException) and exc.status == 404:
                return []
            log.exception(
                'Exception when calling '
                'CoreV1Api->list_pod_for_all_namespaces')
            raise CommandExecutionError(exc)

        for pod in api_response.items:
            pod_deletable = True
            for filt in (
                    _mirrorpod_filter,
                    self.localstorage_filter,
                    self.unreplicated_filter,
                    self.daemonset_filter
            ):
                try:
                    filter_deletable, warning = filt(pod)
                except DrainException as exc:
                    failures.setdefault(
                        exc.message, []).append(pod.metadata.name)

                if warning:
                    warnings.setdefault(
                        warning, []).append(pod.metadata.name)
                pod_deletable = pod_deletable and filter_deletable
            if pod_deletable:
                pods.append(pod)

        def message(errors):
            msgs = []
            for key, msg in errors.items():
                msgs.append("{0}: {1}".format(key, ", ".join(msg)))
            return "; ".join(msgs)

        if failures:
            raise DrainException(message(failures))
        if warnings:
            log.warning("WARNING: %s", message(warnings))
        return pods

    def run_drain(self, dry_run=False, **kwargs):
        '''Cordon the node if necessary, then drain it.'''
        if not metalk8s_cordon.node_unschedulable(self.node_name):
            metalk8s_cordon.node_cordon(self.node_name)
        return self.evict_pods_orchestrate(dry_run=dry_run)

    def evict_pods_orchestrate(self, dry_run=False):
        '''Delete or evict pods based on eviction support.

        In practice, all the versions we support have eviction, so we just
        evict the pods.
        '''
        try:
            pods = self.get_pods_for_eviction()
        except DrainException as exc:
            if dry_run:
                pods = None
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
            return "Prepared for deletion of pods: {0}".format(
                ", ".join(pods) if pods else "no pods to delete."
            )

        def get_pod(namespace, name):
            '''Retrieve pod information'''
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
                    'CoreV1Api->list_namespaced_daemon_set')
                raise CommandExecutionError(exc)

        try:
            self.evict_pods(pods, get_pod)
        except DrainTimeoutException as exc:
            raise CommandExecutionError(
                "Drain did not complete within {0}".format(exc.message)
            )
        except DrainException as exc:
            remaining_pods = self.get_pods_for_eviction()
            raise CommandExecutionError(
                "Pending pods remaining when the error occurred: {0}".format(
                    exc),
                [pod.metadata.name for pod in remaining_pods]
            )
        return "Eviction complete."

    def evict_pods(self, pods, get_pod_fn):
        '''Evict all pods from list'''
        # TODO: there are a lot of shortcuts here, to be checked

        global_timeout = self._timeout
        for pod in pods:
            # TODO: "too many requests" error not handled
            _ = self.evict_pod(pod)

        pending = self.wait_for_delete(
            pods,
            self.KUBECTL_INTERVAL,
            global_timeout,
            get_pod_fn
        )

        if pending:
            raise DrainTimeoutException(global_timeout)

    @staticmethod
    def not_found(response):
        '''Check whether a K8s API response indicates a resource not found.'''
        return response is None or len(response.items) == 0

    def wait_for_delete(self, pods, interval, timeout, get_pod_fn):
        '''Wait for pods deletion.'''
        total_t = 0
        while total_t < timeout and pods:
            pending = []
            loop_s = time.time()    # For time processing pods
            for pod in pods:
                response = get_pod_fn(pod.metadata.namespace, pod.metadata.name)
                if any([
                        self.not_found(response),
                        response.items[0].metadata.uid != pod.metadata.uid
                ]):
                    log.info("%s evicted", pod.metadata.name)
                else:
                    pending.append(pod)
            loop_d = time.time() - loop_s
            pods = pending
            if pods and loop_d < interval:
                time.sleep(interval - loop_d)
            total_t += time.time() - loop_s
        return pods

    def evict_pod(self, pod):
        '''Evict a pod.'''
        delete_options = V1DeleteOptions()
        if self._grace_period >= 0:
            delete_options.grace_period = self._grace_period

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
    '''
    Drain the the node identified by the name `node_name`.

    CLI Examples::

        salt '*' kubernetes.node_drain node_name="minikube"
    '''

    cfg = metalk8s_kubernetes._setup_conn(**kwargs)
    drainer = Drain(
        node_name,
        force=force,
        grace_period=grace_period,
        ignore_daemonset=ignore_daemonset,
        timeout=timeout,
        delete_local_data=delete_local_data
    )
    try:
        result = drainer.run_drain(dry_run=dry_run, **kwargs)
    except CommandExecutionError as exc:
        return False, exc.message
    finally:
        metalk8s_kubernetes._cleanup(**cfg)

    return True, result
