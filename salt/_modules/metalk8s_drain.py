"""
Module for draining a Kubernetes node.

This implementation is based on the go code of `kubectl`, for more details see
https://github.com/kubernetes/kubernetes/blob/v1.11.10/pkg/kubectl/cmd/drain.go

This module's functions are merged into the `metalk8s_kubernetes`
module when called by salt by virtue of its `__virtualname__` attribute.
"""

import json
import logging
import operator
import time

from salt.exceptions import CommandExecutionError

try:
    import kubernetes
    from kubernetes.client.rest import ApiException
    from kubernetes.client.models.v1_object_meta import V1ObjectMeta
    from kubernetes.client.models.v1_eviction import V1Eviction
    from urllib3.exceptions import HTTPError

    HAS_LIBS = True
except ImportError:
    HAS_LIBS = False


log = logging.getLogger(__name__)


__virtualname__ = "metalk8s_kubernetes"


def __virtual__():
    """
    Check dependencies
    """
    if HAS_LIBS:
        return __virtualname__

    return False, "python kubernetes library not found"


class DrainException(Exception):
    """General purpose drain exception."""

    def __init__(self, message):
        super(DrainException, self).__init__()
        self.message = message

    def __str__(self):
        return f"<{str(self.__class__)}> {self.message}"


class DrainTimeoutException(DrainException):
    """Timeout-specific drain exception."""


def _mirrorpod_filter(pod):
    """Check if a pod contains the mirror K8s annotation.

    Args:
      - pod: kubernetes pod object
    Returns: (False, "") if the pod has the mirror annotation,
             (True, "") if not
    """
    mirror_annotation = "kubernetes.io/config.mirror"

    annotations = pod["metadata"].get("annotations")
    if annotations and mirror_annotation in annotations:
        return False, ""
    return True, ""


def _has_local_storage(pod):
    """Check if a pod has local storage.

    Args:
      - pod: kubernetes pod object
    Returns: True if the pod uses local storage, False if not
    """
    for volume in pod["spec"].get("volumes", []):
        if volume.get("emptyDir") is not None:
            return True
    return False


def _get_controller_of(pod):
    """Get a pod's controller's reference.

    This uses the pod's metadata, so there is no guarantee that
    the controller object reference returned actually corresponds to a
    controller object in the Kubernetes API.

    Args:
      - pod: kubernetes pod object
    Returns: the reference to a controller object
    """
    if pod["metadata"].get("ownerReferences"):
        for owner_ref in pod["metadata"]["ownerReferences"]:
            if owner_ref.get("controller"):
                return owner_ref
    return None


def _message_from_pods_dict(errors_dict):
    """Form a message string from a 'pod kind': [pod name...] dict.

    Args:
      - errors_dict: a dict with keys pod kinds as string and values
                     names of pods of that kind
    Returns: a string message
    """
    msg_list = [f"{key}: {', '.join(msg)}" for key, msg in errors_dict.items()]
    return "; ".join(msg_list)


# pod statuses
POD_STATUS_SUCCEEDED = "Succeeded"
POD_STATUS_FAILED = "Failed"
POD_STATUS_PENDING = "Pending"


class Drain(object):
    """The drain object class.

    This object contains the options associated to a drain request on a
    given node, as well as the methods used to execute the drain.
    """

    # According to `kubectl` code, this value should be 1 second by default
    KUBECTL_INTERVAL = 1
    WARNING_MSG = {
        "daemonset": "Ignoring DaemonSet-managed pods",
        "localStorage": "Deleting pods with local storage",
        "pending": "Ignoring Pending pods",
        "unmanaged": (
            "Deleting pods not managed by ReplicationController, "
            "ReplicaSet, Job, DaemonSet or StatefulSet"
        ),
    }

    FATAL_MSG = {
        "daemonset": "DaemonSet-managed pods",
        "localStorage": "pods with local storage",
        "unmanaged": (
            "pods not managed by ReplicationController, "
            "ReplicaSet, Job, DaemonSet or StatefulSet"
        ),
    }

    def __init__(
        self,
        node_name,
        force=False,
        grace_period=1,
        ignore_daemonset=False,
        ignore_pending=False,
        timeout=0,
        delete_local_data=False,
        best_effort=False,
        **kwargs,
    ):
        self._node_name = node_name
        self._force = force
        self._grace_period = grace_period
        self._ignore_daemonset = ignore_daemonset
        self._ignore_pending = ignore_pending
        # Default timeout is 3600 seconds
        self._timeout = timeout or 3600
        self._delete_local_data = delete_local_data
        self._best_effort = best_effort
        self._kwargs = kwargs

    node_name = property(operator.attrgetter("_node_name"))
    force = property(operator.attrgetter("_force"))
    grace_period = property(operator.attrgetter("_grace_period"))
    ignore_daemonset = property(operator.attrgetter("_ignore_daemonset"))
    ignore_pending = property(operator.attrgetter("_ignore_pending"))
    timeout = property(operator.attrgetter("_timeout"))
    delete_local_data = property(operator.attrgetter("_delete_local_data"))

    def localstorage_filter(self, pod):
        """Compute eviction status for the pod according to local storage.

        Args:
          - pod: the pod for which eviction is computed
        Return: (is_deletable: bool, warning: str)
        Raises: DrainException if deleting local data is not possible
        """
        if not _has_local_storage(pod):
            return True, ""
        if not self.delete_local_data:
            raise DrainException(self.FATAL_MSG["localStorage"])
        return True, self.WARNING_MSG["localStorage"]

    def unreplicated_filter(self, pod):
        """Compute eviction status for the pod according to replication.

        Args:
          - pod: the pod for which eviction is computed
        Returns: (is_deletable: bool, warning: str)
        Raises: DrainException if the pod has no controller and the `force`
                option was not provided.
        """
        # finished pods can be removed
        if pod["status"]["phase"] in (POD_STATUS_SUCCEEDED, POD_STATUS_FAILED):
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

    def get_controller(self, namespace, controller_ref):
        """Get the controller object from a reference to it

        Args:
          - namespace: the queried controller's namespace
          - controller_ref: the queried controller's reference
        Returns:
          - the controller object if found
          - None if not found
        Raises: CommandExecutionError if API fails
        """
        try:
            return __salt__["metalk8s_kubernetes.get_object"](
                name=controller_ref["name"],
                kind=controller_ref["kind"],
                apiVersion=controller_ref["apiVersion"],
                namespace=namespace,
                **self._kwargs,
            )
        except CommandExecutionError as exc:
            # If we get "Unknown object type" just consider we do not know the
            # controller object
            if isinstance(exc.__cause__, ValueError) and "Unknown object type" in str(
                exc.__cause__
            ):
                return None
            raise

    def get_pod_controller(self, pod):
        """Get a pod's controller object reference

        Args:
          - pod: the pod for which we want the controller
        Returns: the pod's controller reference if the controller exists
        Raises: DrainException if the controller matching the referenct is
                not found
        """
        controller_ref = _get_controller_of(pod)
        if controller_ref is None:
            return None
        response = self.get_controller(pod["metadata"]["namespace"], controller_ref)
        if not response:
            meta = pod["metadata"]
            raise DrainException(
                f"Missing controller for pod '{meta['namespace']}/{meta['name']}'"
            )
        return controller_ref

    def status_filter(self, pod):
        """Compute eviction status for the pod according to status.

        If the Pod is pending and `ignore_pending` option was set then
        the pod is just skipped

        Returns: (is_deletable: bool, warning: str)
        """
        if pod["status"]["phase"] == POD_STATUS_PENDING and self.ignore_pending:
            return False, self.WARNING_MSG["pending"]

        return True, ""

    def daemonset_filter(self, pod):
        """Compute eviction status for the pod according to DaemonSet kind.

        A daemonset will generally not be deleted, regardless of flags, but we
        can determine if their presence constitutes an error.

        The exception to this rule is when the pod is orphaned, meaning that
        the management resource is not found, and we have the `force` flag set.

        Returns: (is_deletable: bool, warning: str)
        Raises: DrainException if the DaemonSet is in unexpected state and the
                `ignore_daemonset` option was not set
        """
        controller_ref = _get_controller_of(pod)

        if controller_ref is None or controller_ref["kind"] != "DaemonSet":
            return True, ""

        controller = self.get_controller(pod["metadata"]["namespace"], controller_ref)

        if not controller:
            if self.force:
                # Not found and forcing: remove orphan pods with warning
                return (True, "Default to deletable on pod with no controller found")

            raise DrainException(
                "Missing controller for pod "
                f"'{pod['metadata']['namespace']}/{pod['metadata']['name']}'"
            )

        if not self.ignore_daemonset:
            raise DrainException(self.FATAL_MSG["daemonset"])

        return False, self.WARNING_MSG["daemonset"]

    def get_pods_for_eviction(self):
        """Compute node drain status according to deletable pods."""
        warnings = {}
        failures = {}
        pods = []

        all_pods = __salt__["metalk8s_kubernetes.list_objects"](
            kind="Pod",
            apiVersion="v1",
            all_namespaces=True,
            field_selector=f"spec.nodeName={self.node_name}",
            **self._kwargs,
        )

        for pod in all_pods:
            is_deletable = True
            for pod_filter in (
                _mirrorpod_filter,
                self.localstorage_filter,
                self.unreplicated_filter,
                self.daemonset_filter,
                self.status_filter,
            ):
                try:
                    filter_deletable, warning = pod_filter(pod)
                except DrainException as exc:
                    failures.setdefault(exc.message, []).append(pod["metadata"]["name"])

                if warning:
                    warnings.setdefault(warning, []).append(pod["metadata"]["name"])
                is_deletable &= filter_deletable

            if is_deletable:
                pods.append(pod)

        if failures:
            raise DrainException(_message_from_pods_dict(failures))
        if warnings:
            log.warning("WARNING: %s", _message_from_pods_dict(warnings))
        return pods

    def run_drain(self, dry_run=False):
        """Drain the targeted node.

        In practice, we check the node for unevictable pods according to
        the passed options, and evict the pod if and only if all pods on
        the node are evictable.

        Args:
          - dry_run: dry run mode, where evictable pods will be computed
                     but no eviction will be triggered.
        Returns: string message
        Raises: CommandExecutionError in case of timeout or eviction failure
        """
        log.debug("Beginning drain of Node %s", self.node_name)
        try:
            pods = self.get_pods_for_eviction()
        except DrainException as exc:
            raise CommandExecutionError(
                (
                    f"The following are not deletable: {exc.message}. "
                    "You can ignore DaemonSet pods with the "
                    "ignore_daemonset flag."
                )
            ) from exc

        if pods:
            pods_to_evict = ", ".join([pod["metadata"]["name"] for pod in pods])
        else:
            pods_to_evict = "no pods to evict."

        if dry_run:
            # Would be nice to create the Eviction in dry-run mode and see if
            # we hit some 429 Too Many Requests (because a disruption budget
            # would prevent the eviction)
            return f"Prepared for eviction of pods: {pods_to_evict}"

        log.debug("Starting eviction of pods: %s", pods_to_evict)
        try:
            self.evict_pods(pods)
        except DrainTimeoutException as exc:
            remaining_pods = self.get_pods_for_eviction()
            raise CommandExecutionError(  # pylint: disable=raise-missing-from
                f"{exc.message} List of remaining pods to follow",
                [pod["metadata"]["name"] for pod in remaining_pods],
            )
        except CommandExecutionError as exc:
            remaining_pods = self.get_pods_for_eviction()
            raise CommandExecutionError(  # pylint: disable=raise-missing-from
                f"{exc.message} List of remaining pods to follow",
                [pod["metadata"]["name"] for pod in remaining_pods],
            )
        return "Eviction complete."

    def evict_pods(self, pods):
        """Trigger the eviction process for all pods passed.

        Args:
          - pods: list of Kubernetes API pods to evict
        Returns: None
        Raises: DrainTimeoutException if the eviction process is not complete
                after the specified timeout value
        """
        self.start_timer()
        evicted_pods = []
        for pod in pods:
            while self.check_timer():
                evicted = evict_pod(
                    name=pod["metadata"]["name"],
                    namespace=pod["metadata"]["namespace"],
                    grace_period=self.grace_period,
                    **self._kwargs,
                )
                if evicted:
                    evicted_pods.append(pod)
                    break

                if self._best_effort:
                    break
                time.sleep(5)  # kubectl waits 5 seconds

        self.wait_for_eviction(evicted_pods)

    def wait_for_eviction(self, pods):
        """Wait for pods deletion.

        Args:
          - pods: the list of pods on which eviction was triggered, for which
                  we wait until they are no longer present in API queries.
        Returns: None
        Raises: DrainTimeoutException if the eviction process is not complete
                after the specified timeout value
        """
        while self.check_timer():
            self.tick(self.KUBECTL_INTERVAL)
            pending = []
            for pod in pods:
                response = __salt__["metalk8s_kubernetes.get_object"](
                    kind="Pod",
                    apiVersion="v1",
                    name=pod["metadata"]["name"],
                    namespace=pod["metadata"]["namespace"],
                    **self._kwargs,
                )
                if (
                    not response
                    or response["metadata"]["uid"] != pod["metadata"]["uid"]
                ):
                    log.info("%s evicted", pod["metadata"]["name"])
                else:
                    log.debug(
                        "Waiting for eviction of Pod %s (current status: %s)",
                        pod["metadata"]["name"],
                        pod.get("status", {}).get("phase"),
                    )
                    pending.append(pod)

            if not pending:
                break

            pods = pending

    def start_timer(self):
        self._start = time.time()

    def check_timer(self):
        if time.time() - self._start > self.timeout:
            raise DrainTimeoutException(
                f"Drain did not complete within {self.timeout} seconds"
            )
        return True

    def tick(self, interval):
        last_tick = getattr(self, "_tick", None)
        if last_tick is not None:
            remaining = interval - (time.time() - last_tick)
            if remaining > 0:
                time.sleep(remaining)
        self._tick = time.time()


def evict_pod(name, namespace="default", grace_period=1, **kwargs):
    """Trigger the eviction process for a single pod.

    Args:
        - name          : the name of the pod to evict
        - namespace     : the namespace of the pod to evict
        - grace_period  : the time to wait before killing the pod
    Returns: whether the eviction was successfully created or not
    Raises: CommandExecutionError in case of API error
    """
    delete_options = kubernetes.client.V1DeleteOptions()
    if grace_period >= 0:
        delete_options.grace_period = grace_period

    object_meta = V1ObjectMeta(name=name, namespace=namespace)

    kubeconfig, context = __salt__["metalk8s_kubernetes.get_kubeconfig"](**kwargs)

    client = __utils__["metalk8s_kubernetes.get_client"](kubeconfig, context)

    # DynamicClient does not handle Pod eviction, so compute the path manually
    path = (
        client.resources.get(api_version="v1", kind="Pod").path(
            name=name, namespace=namespace
        )
        + "/eviction"
    )

    try:
        client.request(
            "post",
            path,
            body=V1Eviction(delete_options=delete_options, metadata=object_meta),
        )
    except (ApiException, HTTPError) as exc:
        if isinstance(exc, ApiException):
            if exc.status == 404:
                # Seems to be ignored in kubectl, let's do the same
                log.debug(
                    "Received '404 Not Found' when creating Eviction for %s, "
                    "ignoring",
                    name,
                )
                return True
            if exc.status == 429:
                # Too Many Requests: the eviction is rejected, but indicates
                # we should retry later (probably due to a disruption budget)
                status = json.loads(exc.body)
                log.info(
                    "Cannot evict %s at the moment: %s",
                    name,
                    status["message"],
                )
                # When implemented by Kubernetes, read the `Retry-After` advice
                return False

        raise CommandExecutionError(
            f'Failed to evict pod "{name}" in namespace "{namespace}"'
        ) from exc

    return True


def node_drain(
    node_name,
    force=False,
    grace_period=1,
    ignore_daemonset=False,
    ignore_pending=False,
    timeout=0,
    delete_local_data=False,
    best_effort=False,
    dry_run=False,
    **kwargs,
):
    """Trigger the drain process for a node.

    Args:
      - force             : ignore unreplicated pods (i.e. StaticPod pods)
      - grace_period      : eviction grace period
      - ignore_daemonset  : ignore daemonsets in eviction process
      - ignore_pending    : ignore pending pods
      - timeout           : drain process timeout value
      - delete_local_data : force deletion for pods with local storage
      - best_effort       : try to drain the node as much as possible but do not
                            retry/fail if unable to evict some pods
      - dry_run           : only run pod selection process, not eviction

    Keyword args: connection parameters, passed through to connection utility
                  module.
    Returns: None
    Raises: CommandExecutionError if the drain process was unsuccessful/
    """

    drainer = Drain(
        node_name,
        force=force,
        grace_period=grace_period,
        ignore_daemonset=ignore_daemonset,
        ignore_pending=ignore_pending,
        timeout=timeout,
        delete_local_data=delete_local_data,
        best_effort=best_effort,
        **kwargs,
    )
    __salt__["metalk8s_kubernetes.cordon_node"](node_name, **kwargs)

    return drainer.run_drain(dry_run=dry_run)
