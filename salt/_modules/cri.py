"""
Various functions to interact with a CRI daemon (through :program:`crictl`).
"""

import logging
import re
import time

from salt.exceptions import CommandExecutionError
import salt.utils.json


log = logging.getLogger(__name__)


__virtualname__ = "cri"


def __virtual__():
    return __virtualname__


def list_images():
    """
    List the images stored in the CRI image cache.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    log.info("Listing CRI images")
    out = __salt__["cmd.run_all"]("crictl images -o json")
    if out["retcode"] != 0:
        log.error("Failed to list images")
        return None

    return salt.utils.json.loads(out["stdout"])["images"]


def _get_used_image_ids():
    """
    List image ids for used containers
    """
    containers = __salt__["cmd.run_all"]("crictl ps -o json")
    if containers["retcode"] != 0:
        log.error("Failed to list containers")
        return None
    containers = salt.utils.json.loads(containers["stdout"])["containers"]
    return [container["imageRef"] for container in containers]


def list_used_images():
    """
    List the used images stored in the CRI image cache.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    log.info("Listing used CRI images")

    images = list_images()
    if images is None:
        return None

    used_images_ids = _get_used_image_ids()
    if used_images_ids is None:
        return None

    return [image for image in images if image["id"] in used_images_ids]


def list_unused_images():
    """
    List the unused images stored in the CRI image cache.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    log.info("Listing unused CRI images")

    images = list_images()
    if images is None:
        return None

    used_images_ids = _get_used_image_ids()
    if used_images_ids is None:
        return None

    return [image for image in images if image["id"] not in used_images_ids]


def prune_images():
    """
    Prune unused images in the CRI image cache.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    log.info("Pruning CRI images")
    out = __salt__["cmd.run_all"]("crictl rmi --prune")
    if out["retcode"] != 0:
        log.error("Failed to prune images")
        msg = out["stderr"] or out["stdout"]
        raise CommandExecutionError(f"failed to prune CRI images: {msg}")
    return True


def available(name):
    """
    Check if given image exists in the containerd namespace image list

    name
        Name of the container image
    """
    images = list_images()
    available = False
    if not images:
        return False

    for image in images:
        if name in image.get("repoTags", []):
            available = True
            break
        if name in image.get("repoDigests", []):
            available = True
            break
    return available


_PULL_RES = {
    "sha256": re.compile(r"Image is up to date for sha256:(?P<digest>[a-fA-F0-9]{64})"),
}


def pull_image(image):
    """
    Pull an image into the CRI image cache.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    image
        Tag or digest of the image to pull
    """
    log.info('Pulling CRI image "%s"', image)
    out = __salt__["cmd.run_all"](f'crictl pull "{image}"')

    if out["retcode"] != 0:
        log.error('Failed to pull image "%s"', image)
        return None

    log.info('CRI image "%s" pulled', image)
    stdout = out["stdout"]

    ret = {
        "digests": {},
    }

    for (digest, regex) in _PULL_RES.items():
        re_match = regex.match(stdout)
        if re_match:
            ret["digests"][digest] = re_match.group("digest")

    return ret


def execute(name, command, *args):
    """
    Run a command in a container.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    name
        Name of the target container
    command
        Command to run
    args
        Command parameters
    """
    log.info('Retrieving ID of container "%s"', name)
    out = __salt__["cmd.run_all"](
        f'crictl ps -q --label io.kubernetes.container.name="{name}"'
    )

    if out["retcode"] != 0:
        log.error('Failed to find container "%s"', name)
        return None

    container_id = out["stdout"]
    if not container_id:
        log.error('Container "%s" does not exists', name)
        return None

    cmd_opts = f"{command} {' '.join(args)}"

    log.info('Executing command "%s"', cmd_opts)
    out = __salt__["cmd.run_all"](f"crictl exec {container_id} {cmd_opts}")

    if out["retcode"] != 0:
        log.error('Failed run command "%s"', cmd_opts)
        return None

    return out["stdout"]


def wait_container(name, state, timeout=60, delay=5):
    """
    Wait for a container to be in given state.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    name
        Name of the target container
    state
        State of container, one of: created, running, exited or unknown
    timeout
        Maximum time in sec to wait for container to reach given state
    delay
        Interval in sec between 2 checks
    """
    log.info('Waiting for container "%s" to be in state "%s"', name, state)

    opts = f'--label io.kubernetes.container.name="{name}"'
    if state is not None:
        opts += f" --state {state}"

    last_error = None
    for _ in range(0, timeout, delay):
        out = __salt__["cmd.run_all"](f"crictl ps -q {opts}")

        if out["retcode"] == 0:
            if out["stdout"]:
                return True
            last_error = "No container found"
        else:
            last_error = out["stderr"] or out["stdout"]

        time.sleep(delay)

    error_msg = f'Failed to find container "{name}"'
    if state is not None:
        error_msg += f' in state "{state}"'
    error_msg += f": {last_error}"

    raise CommandExecutionError(error_msg)


def component_is_running(name):
    """Return true if the specified component is running.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    log.info("Checking if compopent %s is running", name)
    out = __salt__["cmd.run_all"](
        f"crictl pods --label component={name} --state=ready -o json"
    )
    if out["retcode"] != 0:
        log.error("Failed to list pods")
        return False
    return len(salt.utils.json.loads(out["stdout"])["items"]) != 0


def ready(timeout=10, retry=5):
    """Wait for container engine to be ready.

    .. note::

        This uses the :command:`crictl version` command, which should be
        configured correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    timeout
        time, in seconds, to wait for container engine to respond
    retry
        number of retries to do
    """
    for attempts in range(1, retry + 1):
        cmd = f"crictl --timeout={timeout}s version"
        ret = __salt__["cmd.run_all"](cmd)
        if ret["retcode"] == 0:
            return True

        log.debug(
            "Container engine is still not ready, attempts[%d/%d]:"
            "\ncmd: %s\nretcode: %d\nstdout: %s\nstderr: %s",
            attempts,
            retry,
            cmd,
            ret["retcode"],
            ret["stdout"],
            ret["stderr"],
        )
        time.sleep(2)

    return False


def stop_pod(labels):
    """Stop pod with matching labels

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    pod_ids = get_pod_id(labels=labels, ignore_not_found=True, multiple=True)
    if not pod_ids:
        return "No pods to stop"

    out = __salt__["cmd.run_all"](f"crictl stopp {' '.join(pod_ids)}")

    if out["retcode"] != 0:
        selector = ",".join([f"{key}={value}" for key, value in labels.items()])
        raise CommandExecutionError(
            f"Unable to stop pods with labels '{selector}':\n"
            f"IDS: {' '.join(pod_ids)}\nSTDERR: {out['stderr']}\nSTDOUT: {out['stdout']}"
        )

    return out["stdout"]


def get_pod_id(
    name=None, labels=None, state=None, multiple=False, ignore_not_found=False
):
    """Retrieve the pod(s) ID(s) in CRI.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    name (str, optional)
        Name of the target pod

    labels (dict, optional)
        Labels of the target pod(s)

    state (str, optional)
        The state in which we want to find the target pod(s) (`None` if all states are
        acceptable)

    multiple (bool)
        Whether to accept multiple pods returned (raise otherwise)

    ignore_not_found (bool)
        Whether to raise if no target pod can be found
    """
    pod_ids_cmd = "crictl pods --quiet"
    info_parts = []
    if name is not None:
        pod_ids_cmd += f" --name {name}"
        info_parts.append(f"name '{name}'")
    if labels is not None:
        selector = ",".join([f"{key}={value}" for key, value in labels.items()])
        pod_ids_cmd += f" --label {selector}"
        info_parts.append(f"labels '{selector}'")
    if state is not None:
        pod_ids_cmd += f" --state {state}"
        info_parts.append(f"state '{state}'")
    info = f"with {' and '.join(info_parts)}"

    pod_ids_out = __salt__["cmd.run_all"](pod_ids_cmd)
    if pod_ids_out["retcode"] != 0:
        raise CommandExecutionError(
            f"Unable to get pod {info}:\n"
            f"STDERR: {pod_ids_out['stderr']}\nSTDOUT: {pod_ids_out['stdout']}"
        )

    pod_ids = pod_ids_out["stdout"].splitlines()
    if not pod_ids:
        if ignore_not_found:
            return None
        raise CommandExecutionError(f"No pod found {info}")

    if multiple:
        return pod_ids

    if len(pod_ids) > 1:
        raise CommandExecutionError(f"More than one pod found {info}")

    return pod_ids[0]


def wait_pod(
    name, state="ready", last_id=None, timeout=60, sleep=5, raise_on_timeout=True
):
    """Wait until the pod has been created/updated.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    name (str)
        Name of the target pod

    state (str, optional)
        The state in which we want to find the target pod (`None` if all states are
        acceptable)

    last_id (str, optional)
        ID of the pod before it was updated (set to `None` if just waiting for a new
        pod)

    timeout (int)
        Number of seconds to wait before bailing out

    sleep (int)
        Number of seconds to wait between two checks

    raise_on_timeout (bool)
        Whether to raise if the timeout period is exceeded (otherwise, return False)
    """
    start_time = time.time()

    while time.time() - start_time < timeout:
        current_ids = get_pod_id(
            name=name,
            state=state,
            ignore_not_found=True,
            multiple=True,  # We may have two during a replacement
        )
        if current_ids and last_id not in current_ids:
            return True
        remaining = timeout + start_time - time.time()
        if remaining < sleep:  # Don't sleep if we know it's going to time out
            break
        time.sleep(sleep)

    if raise_on_timeout:
        verb = "updated" if last_id else "created"
        raise CommandExecutionError(
            f"Pod {name} was not {verb} after {(time.time() - start_time):.0f} seconds"
        )

    return False
