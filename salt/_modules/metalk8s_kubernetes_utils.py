"""Utility methods for interacting with Kubernetes API server.

This module is merged into the `metalk8s_kubernetes` execution module,
by virtue of its `__virtualname__`.
"""
from __future__ import absolute_import

from salt.exceptions import CommandExecutionError
import salt.utils.files
import salt.utils.templates
import salt.utils.yaml

MISSING_DEPS = []
try:
    from kubernetes.client.rest import ApiException
except ImportError:
    MISSING_DEPS.append("kubernetes")

try:
    from urllib3.exceptions import HTTPError
except ImportError:
    MISSING_DEPS.append("urllib3")


__virtualname__ = "metalk8s_kubernetes"


def __virtual__():
    if MISSING_DEPS:
        return False, f"Missing dependencies: {', '.join(MISSING_DEPS)}"

    return __virtualname__


def get_kubeconfig(**kwargs):
    """
    Get the kubeconfig and context from args or directly pillar or from
    salt-master configuration.

    Pillar value from `metalk8s.api_server.kubeconfig` and
    `metalk8s.api_server.context`

    Salt master config from `kubernetes.kubeconfig` and `kubernetes.context`

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.get_kubeconfig kubeconfig="/etc/kubernetes/admin.conf"
        salt-call metalk8s_kubernetes.get_kubeconfig

    Code Example:

    .. code-block:: python

        kubeconfig, context = __salt__['metalk8s_kubernetes.get_kubeconfig'](**kwargs)
    """
    pillar_dict = __pillar__.get("metalk8s", {}).get("api_server", {})

    kubeconfig = (
        kwargs.get("kubeconfig")
        or pillar_dict.get("kubeconfig")
        or __salt__["config.option"]("kubernetes.kubeconfig")
    )
    context = (
        kwargs.get("context")
        or pillar_dict.get("context")
        or __salt__["config.option"]("kubernetes.context")
        or None
    )

    return kubeconfig, context


def get_version_info(**kwargs):
    """Retrieve the API server version information, as a dict.

    The result contains various version details to be as exhaustive as
    possible.

    CLI Example:
        salt '*' metalk8s_kubernetes.get_version_info
    """
    kubeconfig, context = get_kubeconfig(**kwargs)

    try:
        client = __utils__["metalk8s_kubernetes.get_client"](kubeconfig, context)
        return client.version["kubernetes"]
    except (ApiException, HTTPError) as exc:
        raise CommandExecutionError("Failed to get version info") from exc


def ping(**kwargs):
    """Check connection with the API server.

    Returns True if a request could be made, False otherwise.

    CLI Example:
        salt '*' metalk8s_kubernetes.ping
    """
    try:
        get_version_info(**kwargs)
    except CommandExecutionError:
        return False
    return True


def read_and_render_yaml_file(source, template, context=None, saltenv="base"):
    """
    Read a yaml file and, if needed, renders that using the specifieds
    templating. Returns the python objects defined inside of the file.
    """
    sfn = __salt__["cp.cache_file"](source, saltenv)
    if not sfn:
        raise CommandExecutionError(f"Source file '{source}' not found")

    if not context:
        context = {}

    with salt.utils.files.fopen(sfn, "r") as src:
        contents = src.read()

        if template:
            if template in salt.utils.templates.TEMPLATE_REGISTRY:
                data = salt.utils.templates.TEMPLATE_REGISTRY[template](
                    contents,
                    from_str=True,
                    to_str=True,
                    context=context,
                    saltenv=saltenv,
                    grains=__grains__,
                    pillar=__pillar__,
                    salt=__salt__,
                    opts=__opts__,
                )

                if not data["result"]:
                    # Failed to render the template
                    raise CommandExecutionError(
                        f"Failed to render file path with error: {data['data']}"
                    )

                contents = data["data"].encode("utf-8")
            else:
                raise CommandExecutionError(f"Unknown template specified: {template}")

        return salt.utils.yaml.safe_load(contents)


def get_service_endpoints(service, namespace, **kwargs):
    error_tpl = "Unable to get kubernetes endpoints for {} in namespace {}"

    try:
        endpoint = __salt__["metalk8s_kubernetes.get_object"](
            name=service,
            kind="Endpoints",
            apiVersion="v1",
            namespace=namespace,
            **kwargs,
        )
        if not endpoint:
            raise CommandExecutionError("Endpoint not found")
    except CommandExecutionError as exc:
        raise CommandExecutionError(error_tpl.format(service, namespace)) from exc

    try:
        result = []

        for address in endpoint["subsets"][0]["addresses"]:
            # Extract hostname, ip and node_name
            res_ep = {
                k: v for k, v in address.items() if k in ["hostname", "ip", "node_name"]
            }

            # Add ports info to result dict
            res_ep["ports"] = {
                port["name"]: port["port"] for port in endpoint["subsets"][0]["ports"]
            }
            result.append(res_ep)
    except (AttributeError, IndexError, KeyError, TypeError) as exc:
        raise CommandExecutionError(error_tpl.format(service, namespace)) from exc

    return result


def get_service_ips_and_ports(service, namespace, **kwargs):
    try:
        service_object = __salt__["metalk8s_kubernetes.get_object"](
            name=service,
            kind="Service",
            apiVersion="v1",
            namespace=namespace,
            **kwargs,
        )
        if not service_object:
            raise CommandExecutionError("Service not found")
    except CommandExecutionError as exc:
        raise CommandExecutionError(
            f"Unable to get kubernetes service {service} in namespace {namespace}"
        ) from exc

    cip = service_object["spec"].get("clusterIP")
    cips = [cip] if cip else []
    cips.extend(
        [ip for ip in service_object["spec"].get("clusterIPs", []) if ip != cip]
    )

    try:
        unamed = 0
        ports = {}
        service_ports = service_object["spec"]["ports"]

        for port in service_ports:
            if port.get("name"):
                ports[port["name"]] = port["port"]
            else:
                ports[f"unnamed-{unamed}"] = port["port"]
                unamed += 1

        if not ports:
            raise CommandExecutionError("No ports")
    except (
        AttributeError,
        IndexError,
        KeyError,
        TypeError,
        CommandExecutionError,
    ) as exc:
        raise CommandExecutionError(
            f"No ports for service {service} in namespace {namespace}",
        ) from exc

    result = {}
    if cips:
        result["ips"] = cips
    result["ports"] = ports

    return result
