"""
Various functions to interact with a CRI daemon (through :program:`crictl`).
"""

import re
import logging
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
    out = __salt__["cmd.run_all"]('crictl pull "{0}"'.format(image))

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
        'crictl ps -q --label io.kubernetes.container.name="{0}"'.format(name)
    )

    if out["retcode"] != 0:
        log.error('Failed to find container "%s"', name)
        return None

    container_id = out["stdout"]
    if not container_id:
        log.error('Container "%s" does not exists', name)
        return None

    cmd_opts = "{0} {1}".format(command, " ".join(args))

    log.info('Executing command "%s"', cmd_opts)
    out = __salt__["cmd.run_all"]("crictl exec {0} {1}".format(container_id, cmd_opts))

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

    opts = '--label io.kubernetes.container.name="{0}"'.format(name)
    if state is not None:
        opts += " --state {0}".format(state)

    last_error = None
    for _ in range(0, timeout, delay):
        out = __salt__["cmd.run_all"]("crictl ps -q {0}".format(opts))

        if out["retcode"] == 0:
            if out["stdout"]:
                return True
            last_error = "No container found"
        else:
            last_error = out["stderr"] or out["stdout"]

        time.sleep(delay)

    error_msg = 'Failed to find container "{}"'.format(name)
    if state is not None:
        error_msg += ' in state "{}"'.format(state)
    error_msg += ": {}".format(last_error)

    raise CommandExecutionError(error_msg)


def component_is_running(name):
    """Return true if the specified component is running.

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    log.info("Checking if compopent %s is running", name)
    out = __salt__["cmd.run_all"](
        "crictl pods --label component={} --state=ready -o json".format(name)
    )
    if out["retcode"] != 0:
        log.error("Failed to list pods")
        return False
    return len(salt.utils.json.loads(out["stdout"])["items"]) != 0


def ready(timeout=10):
    """Wait for container engine to be ready.

    .. note::

        This uses the :command:`crictl version` command, which should be
        configured correctly on the system, e.g. in :file:`/etc/crictl.yaml`.

    timeout
        time, in seconds, to wait for container engine to respond
    """
    cmd = "crictl --timeout={0}s version".format(timeout)
    log.debug("Checking for container engine to be ready using: %s", cmd)

    return __salt__["cmd.retcode"](cmd) == 0


def stop_pod(labels):
    """Stop pod with matching labels

    .. note::

       This uses the :command:`crictl` command, which should be configured
       correctly on the system, e.g. in :file:`/etc/crictl.yaml`.
    """
    selector = ",".join([f"{key}={value}" for key, value in labels.items()])

    pod_ids_out = __salt__["cmd.run_all"](f"crictl pods --quiet --label={selector}")
    if pod_ids_out["retcode"] != 0:
        raise CommandExecutionError(
            f"Unable to get pods with labels {selector}:\n"
            f"STDERR: {pod_ids_out['stderr']}\nSTDOUT: {pod_ids_out['stdout']}"
        )

    pod_ids = pod_ids_out["stdout"]
    if not pod_ids:
        return "No pods to stop"

    out = __salt__["cmd.run_all"](f"crictl stopp {pod_ids}")

    if out["retcode"] != 0:
        raise CommandExecutionError(
            f"Unable to stop pods with labels {selector}:\n"
            f"IDS: {pod_ids}\nSTDERR: {out['stderr']}\nSTDOUT: {out['stdout']}"
        )

    return out["stdout"]
