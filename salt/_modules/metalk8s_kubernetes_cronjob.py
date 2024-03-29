"""Utiliy methods to interact with Kubernetes Cron Job in MetalK8s.
"""

import time
from salt.exceptions import CommandExecutionError

__virtualname__ = "metalk8s_kubernetes_cronjob"


def __virtual__():
    return __virtualname__


def get_cronjobs(
    suspended=None,
    mark=None,
    all_namespaces=False,
    namespace="default",
    **kwargs,
):
    """Get a list of CronJobs

    Args:
        suspended (bool, optional): filter on the suspended state. Defaults to None.
        all_namespaces (bool, optional): filter to get all namespaces at once. Defaults to False.
        namespace (str, optional): filter on a specific namespace. Defaults to "default".
        mark (str, optional): filter on the mark set in the annotation of the CronJob. Defaults to None.

    Raises:
        CommandExecutionError: if there is no result for the given criteria.

    Returns:
        list: list of CronJobs matching the given criteria.
    """

    results = __salt__["metalk8s_kubernetes.list_objects"](
        kind="CronJob",
        apiVersion="batch/v1",
        all_namespaces=all_namespaces,
        namespace=namespace,
        **kwargs,
    )
    if not results:
        raise CommandExecutionError(
            "No CronJobs found using the given criteria: "
            f"suspended={suspended}, "
            f"all_namespaces={all_namespaces}, "
            f"namespace={namespace}"
        )

    if suspended is not None:
        results = [
            cronjob for cronjob in results if cronjob["spec"]["suspend"] == suspended
        ]

    if mark is not None:
        results = [
            cronjob
            for cronjob in results
            if cronjob.get("metadata", {})
            .get("annotations", {})
            .get("metalk8s.scality.com/suspend_mark")
            == mark
        ]

    return results


def get_cronjob(name, namespace, **kwargs):
    """Get a specific CronJob by name and namespace.

    Args:
        name (str): name of the CronJob.
        namespace (str): namespace of the CronJob.

    Raises:
        CommandExecutionError: if the CronJob is not found.

    Returns:
        dict: the CronJob object.
    """

    cronjob = __salt__["metalk8s_kubernetes.get_object"](
        kind="CronJob",
        apiVersion="batch/v1",
        name=name,
        namespace=namespace,
        **kwargs,
    )
    if not cronjob:
        raise CommandExecutionError(
            f"CronJob {name} not found in namespace {namespace}"
        )

    return cronjob


def _set_cronjob_suspend(name, namespace, suspend, mark=None, **kwargs):
    """Set the suspend state of a CronJob.

    Args:
        name (str): name of the CronJob.
        namespace (str): namespace of the CronJob.
        suspend (bool): the new suspend state.
        mark (str, optional): a mark to set in the annotation of the CronJob. Defaults to None.

    Returns:
        True: if the suspend state has been updated.
    """
    cronjob = get_cronjob(name, namespace, **kwargs)
    patch = {
        "spec": {"suspend": suspend},
        "metadata": {"annotations": {}},
    }

    if suspend and mark is not None:
        patch["metadata"]["annotations"]["metalk8s.scality.com/suspend_mark"] = mark
    else:
        patch["metadata"]["annotations"]["metalk8s.scality.com/suspend_mark"] = None

    if cronjob["spec"]["suspend"] != suspend:
        __salt__["metalk8s_kubernetes.update_object"](
            kind="CronJob",
            apiVersion="batch/v1",
            name=name,
            namespace=namespace,
            patch=patch,
            old_object=cronjob,
            **kwargs,
        )

    return True


def suspend_cronjob(name, namespace, mark=None, **kwargs):
    """Suspend a CronJob.

    Args:
        name (str): name of the CronJob.
        namespace (str): namespace of the CronJob.
        mark (str, optional): a mark to set in the annotation of the CronJob. Defaults to None.

    Returns:
        True: if the suspend state has been updated.
    """
    return _set_cronjob_suspend(
        name,
        namespace,
        suspend=True,
        mark=mark,
        **kwargs,
    )


def activate_cronjob(name, namespace, mark=None, **kwargs):
    """Activate a CronJob.

    Args:
        name (str): name of the CronJob.
        namespace (str): namespace of the CronJob.
        mark (str, optional): a mark to set in the annotation of the CronJob. Defaults to None.

    Returns:
        True: if the suspend state has been updated.
    """
    return _set_cronjob_suspend(name, namespace, suspend=False, mark=mark, **kwargs)


def get_jobs(name, namespace, **kwargs):
    """Get the Jobs created by a CronJob.

    Args:
        name (str): name of the CronJob.
        namespace (str): namespace of the CronJob.

    Returns:
        list: list of Jobs created by the CronJob.
    """
    cronjob_uid = get_cronjob(name, namespace, **kwargs)["metadata"]["uid"]

    # Get all Jobs in the namespace
    jobs = __salt__["metalk8s_kubernetes.list_objects"](
        kind="Job", apiVersion="batch/v1", namespace=namespace, **kwargs
    )

    if not jobs:
        return []

    # Filter Jobs created by the CronJob
    filtered_jobs = []

    for job in jobs:
        for owner_ref in job["metadata"].get("ownerReferences") or []:
            if owner_ref.get("uid") == cronjob_uid:
                filtered_jobs.append(job)
                break

    return filtered_jobs


def suspend_cronjob_and_delete_jobs(
    name,
    namespace,
    mark=None,
    wait=False,
    timeout_seconds=60,
    **kwargs,
):
    """Suspend the CronJob and delete all its Jobs.

    Args:
        name (str): name of the CronJob.
        namespace (str): namespace of the CronJob.
        wait (bool, optional): wait for the Jobs to be deleted. Defaults to False.
        timeout_seconds (int, optional): timeout in seconds to wait for the Jobs to be deleted. Defaults to 60.

    Raises:
        CommandExecutionError: if the wait timeout is exceeded.

    Returns:
        list: list of Jobs that have been deleted.
    """
    suspend_cronjob(name, namespace, mark, **kwargs)

    jobs = get_jobs(name, namespace, **kwargs)

    for job in jobs:
        __salt__["metalk8s_kubernetes.delete_object"](
            kind="Job",
            apiVersion="batch/v1",
            name=job["metadata"]["name"],
            namespace=namespace,
            **kwargs,
        )

    # Wait for jobs to be deleted
    # grace period is 30 seconds usually
    if wait:
        start_ts = time.time()
        while time.time() - start_ts < timeout_seconds:
            waiting_jobs = get_jobs(name, namespace, **kwargs)
            if not waiting_jobs:
                break

            time.sleep(1)
        else:
            waiting_jobs_names = ", ".join([job["name"] for job in waiting_jobs])

            raise CommandExecutionError(
                f"Wait timeout exceeded while deleting the following Jobs {waiting_jobs_names} "
                f"for CronJob {name} in namespace {namespace}"
            )

    # Return the list of deleted jobs
    return jobs
