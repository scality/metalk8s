"""Store data about bootstrap services ip/port in pillar"""

import logging
import os.path

from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_endpoints"


def __virtual__():
    if "metalk8s_kubernetes.get_object" not in __salt__:
        return False, "Missing metalk8s_kubernetes module"
    else:
        return __virtualname__


def ext_pillar(minion_id, pillar, kubeconfig):  # pylint: disable=unused-argument
    services = {
        "kube-system": ["salt-master", "repositories"],
    }

    if not os.path.isfile(kubeconfig):
        error_tplt = "{}: kubeconfig not found at {}"
        endpoints = __utils__["pillar_utils.errors_to_dict"](
            [error_tplt.format(__virtualname__, kubeconfig)]
        )

    else:
        endpoints = {}
        errors = []

        for namespace, services in services.items():
            for service in services:
                service_endpoints = []
                try:
                    service_endpoints = __salt__[
                        "metalk8s_kubernetes.get_service_endpoints"
                    ](service, namespace, kubeconfig=kubeconfig)
                except CommandExecutionError as exc:
                    errors.append(str(exc))

                endpoints.update({service: service_endpoints})

        if errors:
            endpoints.update(__utils__["pillar_utils.errors_to_dict"](errors))

    result = {"metalk8s": {"endpoints": endpoints}}

    __utils__["pillar_utils.promote_errors"](result["metalk8s"], "endpoints")

    return result
