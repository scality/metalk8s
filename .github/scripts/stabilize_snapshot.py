"""Stabilize a MetalK8s cluster built from snapshots.

This script is meant to run after a fresh spawn of MetalK8s snapshot images, to ensure
it is ready for running tests (such as an upgrade).

Since it is designed for use in CI, it retrieve its configuration options from
environment variables.

Assumption is made that the script is executed from the bootstrap node, with sufficient
permissions to execute `kubectl` (with `/etc/kubernetes/admin.conf`) and `crictl`
commands.
"""

import json
import os
import subprocess
import sys
import time


# Utils {{{

TRUTHY_VALUES = {"y", "yes", "t", "true", "on", "1"}
FALSY_VALUES = {"n", "no", "f", "false", "off", "0"}


def strtobool(value):
    """Re-implementation of the now deprecated `distutils.utils.strtobool` function."""
    if not isinstance(value, str):
        raise ValueError("Not a string")
    if value.lower() in TRUTHY_VALUES:
        return True
    if value.lower() in FALSY_VALUES:
        return False
    raise ValueError(f"Unrecognized value: '{value}'")


def get_env(key, cast=None, default=None):
    value = os.environ.get(key, default=default)
    return cast(value) if cast is not None else value


def env_switch(key, default=False):
    return get_env(key, cast=strtobool, default="y" if default else "n")


def die(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def run(*args, capture_output=False, **kwargs):
    return subprocess.run(
        args,
        stdout=subprocess.PIPE if capture_output else None,
        stderr=subprocess.PIPE if capture_output else None,
        **kwargs,
    )


def get_kubeconfig_arg():
    return f"--kubeconfig={os.environ.get('KUBECONFIG', '/etc/kubernetes/admin.conf')}"


def kubectl(*args, parse_json=False, **kwargs):
    if parse_json:
        result = run(
            "kubectl",
            get_kubeconfig_arg(),
            *args,
            "-o=json",
            capture_output=True,
            **kwargs,
        )
        return json.loads(result.stdout)
    return run("kubectl", get_kubeconfig_arg(), *args, **kwargs)


def get_salt_master():
    result = run(
        "crictl",
        "ps",
        "--quiet",
        "--label=io.kubernetes.container.name=salt-master",
        "--state=Running",
        capture_output=True,
    )
    container_id = result.stdout.decode().strip()
    if not container_id:
        print("Failed to find salt-master container", file=sys.stderr)
        return None
    return container_id


def is_crashlooping(pod):
    for status in pod["status"]["containerStatuses"]:
        if (
            not status["ready"]
            and status["state"].get("waiting", {}).get("reason") == "CrashLoopBackOff"
        ):
            return True
    return False


def are_pods_stabilized(duration):
    try:
        kubectl(
            "get",
            "pods",
            "--all-namespaces",
            "--selector=!job-name",
            "--no-headers",
            "--watch-only",
            capture_output=True,
            timeout=duration,
        )
    except subprocess.TimeoutExpired as exc:
        if exc.stdout:
            print(f"Pods are still unstable:\n{exc.stdout.decode()}", file=sys.stderr)
            return False

    try:
        pod_list = kubectl(
            "get", "pods", "--all-namespaces", "--selector=!job-name", parse_json=True
        )
    except json.decoder.JSONDecodeError as exc:
        print(f"Error parsing JSON output when getting pods: {exc}", file=sys.stderr)
        return False

    return not any(map(is_crashlooping, pod_list["items"]))


# }}}
# Main logic {{{


def wait_for_salt(get_master_attempts=60, ping_minions_attempts=10, sleep_duration=5):
    """Wait for Salt master and minions to become ready using crictl."""
    print("Waiting for Salt master container...")
    salt_master_container_id = None
    for _ in range(get_master_attempts):
        salt_master_container_id = get_salt_master()
        if salt_master_container_id is not None:
            print(f"Found Salt master! ({salt_master_container_id})")
            break
        time.sleep(sleep_duration)
    else:
        die(
            "Failed to find a running Salt master container "
            f"after {get_master_attempts} attempts."
        )

    print("Waiting for Salt minions to respond...")
    for _ in range(ping_minions_attempts):
        try:
            run(
                "crictl",
                "exec",
                salt_master_container_id,
                "salt",
                "*",
                "test.ping",
                check=True,
            )
        except subprocess.CalledProcessError:
            continue
        else:
            print("Minions responded!")
            break
    else:
        die(f"Failed to reach all Salt minions after {ping_minions_attempts} attempts.")


def wait_pods_stable(attempts=30, sleep_duration=5, stabilization_duration=30):
    """Wait for pods to stabilize in a given state."""
    print("Waiting for pods to stabilize...")
    start = time.time()
    for attempt in range(attempts):
        print(f"Attempt {attempt + 1}/{attempts}")
        if are_pods_stabilized(stabilization_duration):
            break
        time.sleep(sleep_duration)
    else:
        res = kubectl(
            "get",
            "pods",
            "--all-namespaces",
            "--selector=!job-name",
            capture_output=True,
        )
        die(
            f"Pods did not stabilize after {(time.time() - start):.1f} seconds."
            f"\n\n{res.stdout}"
        )
    print(f"Pods are stable [{(time.time() - start):.1f}]")


def check_pods_running():
    """Check that all pods are in Running state."""
    print("Checking that all pods are running...")
    try:
        kubectl(
            "wait",
            "pods",
            "--all",
            "--all-namespaces",
            "--for=condition=Ready",
            "--timeout=10s",
            "--selector=!job-name",  # We filter out Jobs (they can't be Ready)
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        die(
            f"Not all pods are running:\nstdout:\n{exc.stdout.decode()}\n"
            f"stderr:\n{exc.stderr.decode()}"
        )
    print("All pods are running!")


def check_no_disk_pressure(check_count=12, sleep_duration=10, wait_timeout=600):
    """Check that nodes do not suffer from disk pressure."""
    print("Checking that nodes are not suffering from disk pressure...")
    for _ in range(check_count):
        try:
            kubectl(
                "wait",
                "nodes",
                "--all",
                "--for=condition=DiskPressure=False",
                f"--timeout={wait_timeout}s",
                capture_output=True,
                check=True,
            )
        except subprocess.CalledProcessError:
            run("crictl", "exec", get_salt_master(), "salt", "*", "disk.percent")
            die(f"Some nodes still have disk pressure after {wait_timeout} seconds.")
        else:
            time.sleep(sleep_duration)
    print("Nodes are OK!")


def main():
    """Main routine for the stabilize_snapshot script."""

    common_sleep_duration = get_env("SLEEP_TIME", cast=int, default=5)
    wait_for_salt(
        get_master_attempts=get_env("WAIT_SALT_MASTER_ATTEMPTS", cast=int, default=60),
        ping_minions_attempts=get_env(
            "PING_SALT_MINIONS_ATTEMPTS", cast=int, default=10
        ),
        sleep_duration=common_sleep_duration,
    )

    wait_pods_stable(
        attempts=get_env("STABILIZATION_ATTEMPTS", cast=int, default=30),
        sleep_duration=common_sleep_duration,
        stabilization_duration=get_env("STABILIZATION_TIME", cast=int, default=120),
    )

    check_pods_running()

    if env_switch("CHECK_DISK_PRESSURE", True):
        check_no_disk_pressure(
            check_count=get_env("CHECK_DISK_PRESSURE_ATTEMPTS", cast=int, default=6),
            sleep_duration=common_sleep_duration,
            wait_timeout=get_env("CHECK_DISK_PRESSURE_TIMEOUT", cast=int, default=600),
        )

    print("Cluster is ready!")


# }}}

if __name__ == "__main__":
    main()
