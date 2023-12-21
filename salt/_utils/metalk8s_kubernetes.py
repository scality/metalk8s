"""Utility methods for MetalK8s Kubernetes modules.
"""

import time

MISSING_DEPS = []

try:
    import kubernetes
except ImportError:
    MISSING_DEPS.append("kubernetes")

__virtualname__ = "metalk8s_kubernetes"


def __virtual__():
    if MISSING_DEPS:
        error_msg = f"Missing dependencies: {', '.join(MISSING_DEPS)}"
        return False, error_msg

    return __virtualname__


def get_client(kubeconfig, context, attempts=5):
    """
    Simple wrapper to retry on DynamicClient creation since it
    may fail from time to time
    """
    while True:
        try:
            return kubernetes.dynamic.DynamicClient(
                kubernetes.config.new_client_from_config(kubeconfig, context)
            )
        except Exception:  # pylint: disable=broad-except
            if attempts < 0:
                raise
            attempts -= 1
            time.sleep(5)
