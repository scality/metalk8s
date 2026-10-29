"""Execution methods for management of Kubernetes objects.

This module relies on the `metalk8s_kubernetes` custom Salt utils module for
parsing K8s object manifests, and providing direct bindings to the Python
`kubernetes.client` models and APIs.

Core methods (create_, get_, remove_, and replace_object) are defined in this
module, while other methods can be found in `metalk8s_kubernetes_utils.py`,
`metalk8s_drain.py` and `metalk8s_cordon.py`.
"""

from datetime import datetime
import json
import logging
import re

from salt.exceptions import CommandExecutionError
from salt.utils import yaml
import salt.utils.data

MISSING_DEPS = []

try:
    import kubernetes.client as k8s_client
    from kubernetes.dynamic.exceptions import ResourceNotFoundError
    from kubernetes.client.rest import ApiException
except ImportError:
    MISSING_DEPS.append("kubernetes")

try:
    from urllib3.exceptions import HTTPError
except ImportError:
    MISSING_DEPS.append("urllib3")

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_kubernetes"


def __virtual__():
    if MISSING_DEPS:
        error_msg = f"Missing dependencies: {', '.join(MISSING_DEPS)}"
        return False, error_msg

    return __virtualname__


def _handle_error(exception, action):
    """Wrap an exception raised during a call to the K8s API.

    Note that 'get' and 'delete' will not re-raise if the error is just
    a "404 NOT FOUND", and instead return `None`.
    """
    base_msg = f"Failed to {action} object"

    if (
        action in ["delete", "get"]
        and isinstance(exception, ApiException)
        and exception.status == 404
    ):
        return None
    elif (
        action == "replace"
        and isinstance(exception, ApiException)
        and exception.status == 409
    ):
        raise CommandExecutionError("409 Conflict") from exception
    else:
        raise CommandExecutionError(base_msg) from exception


def _object_manipulation_function(action):
    """Generate an execution function based on a CRUD method to use."""
    assert action in (
        "create",
        "get",
        "replace",
        "delete",
        "patch",
    ), f'Method "{action}" is not supported'

    def method(
        manifest=None,
        name=None,
        kind=None,
        apiVersion=None,
        namespace="default",
        patch=None,
        old_object=None,
        template="jinja",
        defaults=None,
        saltenv="base",
        **kwargs,
    ):
        if manifest is None:
            if (
                action in ["get", "delete", "patch"]
                and name
                and kind
                and apiVersion
                and (action != "patch" or patch)
            ):
                # Build a simple manifest using kwargs information as
                # get/delete do not need a full body
                manifest = {
                    "apiVersion": apiVersion,
                    "kind": kind,
                    "metadata": {"name": name, "namespace": namespace},
                }
            elif name and not kind and not apiVersion and not patch:
                try:
                    manifest = __salt__[
                        "metalk8s_kubernetes.read_and_render_yaml_file"
                    ](source=name, template=template, context=defaults, saltenv=saltenv)
                except IOError as exc:
                    raise CommandExecutionError(
                        f'Failed to read file "{name}"'
                    ) from exc
                except yaml.YAMLError as exc:
                    raise CommandExecutionError(
                        f'Invalid YAML in file "{name}"'
                    ) from exc
        elif name is not None:
            raise CommandExecutionError('Cannot use both "manifest" and "name".')

        if not manifest:
            needed_params = ['"manifest"', '"name" (path to a file)']
            if action in ["get", "delete", "patch"]:
                needed_params.append(
                    " and ".join(
                        ['"name"', '"kind"', '"apiVersion"']
                        + (['"patch"'] if action == "patch" else [])
                    )
                )
            raise CommandExecutionError(
                f"Must provide one of {' or '.join(needed_params)} to {action} object."
            )

        if action in ["delete", "get"]:
            # Only keep needed information and remove anything else
            # to avoid invalid error on slots formatting
            manifest = {
                "apiVersion": manifest["apiVersion"],
                "kind": manifest["kind"],
                "metadata": {
                    "name": manifest.get("metadata", {}).get("name"),
                    "namespace": manifest.get("metadata", {}).get(
                        "namespace", namespace
                    ),
                },
            }

        # Format slots on the manifest
        manifest = __salt__.metalk8s.format_slots(manifest)

        # Adding label containing metalk8s version (retrieved from saltenv)
        if action in ["create", "replace"]:
            match = re.search(r"^metalk8s-(?P<version>.+)$", saltenv)
            manifest.setdefault("metadata", {}).setdefault("labels", {})[
                "metalk8s.scality.com/version"
            ] = (match.group("version") if match else "unknown")
            manifest["metadata"]["labels"]["app.kubernetes.io/managed-by"] = "salt"
            manifest["metadata"]["labels"]["heritage"] = "salt"

        log.debug("%sing object with manifest: %s", action[:-1].capitalize(), manifest)

        kubeconfig, context = __salt__["metalk8s_kubernetes.get_kubeconfig"](**kwargs)

        client = __utils__["metalk8s_kubernetes.get_client"](kubeconfig, context)

        try:
            api = client.resources.get(
                api_version=manifest["apiVersion"], kind=manifest["kind"]
            )
        except ResourceNotFoundError as exc:
            raise CommandExecutionError(
                f"Kind '{manifest['kind']}' from apiVersion '{manifest['apiVersion']}' is unknown"
            ) from exc

        method_func = getattr(api, action)

        call_kwargs = {}
        if action != "create":
            call_kwargs["name"] = manifest["metadata"]["name"]
        if api.namespaced:
            call_kwargs["namespace"] = manifest["metadata"].get("namespace")
        if action == "delete":
            call_kwargs["body"] = k8s_client.V1DeleteOptions(
                propagation_policy="Foreground"
            )
        elif action == "patch":
            if "content_type" in kwargs:
                call_kwargs["content_type"] = kwargs["content_type"]

            if patch:
                call_kwargs["body"] = patch
            else:
                call_kwargs["body"] = manifest
                # When patching remove "searching" key like kind and apiVersion
                call_kwargs["body"].pop("kind")
                call_kwargs["body"].pop("apiVersion")
                call_kwargs["body"]["metadata"].pop("name")
                # Namespace may be empty so add a default to not failing
                call_kwargs["body"]["metadata"].pop("namespace", None)
        elif action != "get":
            call_kwargs["body"] = manifest

        if action == "replace" and old_object:
            # Some attributes have to be preserved
            # otherwise exceptions will be thrown
            if "resourceVersion" in old_object["metadata"]:
                call_kwargs["body"]["metadata"]["resourceVersion"] = old_object[
                    "metadata"
                ]["resourceVersion"]
            # Keep `clusterIP` and `healthCheckNodePort` if not present in the body
            if api.api_version == "v1" and api.kind == "Service":
                if not call_kwargs["body"]["spec"].get("clusterIP"):
                    call_kwargs["body"]["spec"]["clusterIP"] = old_object["spec"].get(
                        "clusterIP"
                    )
                if call_kwargs["body"]["spec"].get(
                    "type"
                ) == "LoadBalancer" and not call_kwargs["body"]["spec"].get(
                    "healthCheckNodePort"
                ):
                    call_kwargs["body"]["spec"]["healthCheckNodePort"] = old_object[
                        "spec"
                    ].get("healthCheckNodePort")
            # Keep the webhooks `caBundle` if not present in the body.
            # Something else injects it, e.g. cert-manager. Every call to the
            # webhook fails until it is injected again.
            if api.api_version == "admissionregistration.k8s.io/v1" and api.kind in [
                "MutatingWebhookConfiguration",
                "ValidatingWebhookConfiguration",
            ]:
                old_ca_bundles = {
                    webhook["name"]: webhook["clientConfig"]["caBundle"]
                    for webhook in old_object.get("webhooks") or []
                    if (webhook.get("clientConfig") or {}).get("caBundle")
                }
                for webhook in call_kwargs["body"].get("webhooks") or []:
                    client_config = webhook.setdefault("clientConfig", {})
                    if (
                        not client_config.get("caBundle")
                        and webhook.get("name") in old_ca_bundles
                    ):
                        client_config["caBundle"] = old_ca_bundles[webhook["name"]]
            # Keep the data of service account token Secrets if not present in
            # the body. The token controller fills it in, and would mint a new
            # token on every replace otherwise.
            if (
                api.api_version == "v1"
                and api.kind == "Secret"
                and call_kwargs["body"].get("type")
                == "kubernetes.io/service-account-token"
                and not call_kwargs["body"].get("data")
                and old_object.get("data")
            ):
                call_kwargs["body"]["data"] = old_object["data"]

        log.debug("Running '%s' with: %s", action, call_kwargs)

        try:
            result = method_func(**call_kwargs)
        except (ApiException, HTTPError) as exc:
            return _handle_error(exc, action)

        # NOTE: result is always either a standard `kubernetes.client` model,
        return result.to_dict()

    base_doc = f"""
    {action.capitalize()} an object from its manifest.

    A manifest should be passed in standard Kubernetes format as a dictionary,
    or through a filepath."""

    if action in ["create", "replace"]:
        example_manifest = {
            "kind": "Pod",
            "apiVersion": "v1",
            "metadata": {"name": "busybox", "namespace": "default"},
            "spec": {
                "containers": {
                    "image": "busybox",
                    "command": ["sleep", "3600"],
                    "name": "busybox",
                },
                "restartPolicy": "Always",
            },
        }
        method.__doc__ = f"""{base_doc}

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.{action}_object name=/root/object.yaml
        salt-call metalk8s_kubernetes.{action}_object manifest="{example_manifest}"
        """
    elif action in ["get", "delete"]:
        example_manifest = {
            "kind": "Node",
            "apiVersion": "v1",
            "metadata": {"name": "bootstrap"},
        }
        method.__doc__ = f"""{base_doc}
    Ability to {action} an object using object description 'name', 'kind'
    and 'apiVersion'.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.{action}_object name=/root/object.yaml
        salt-call metalk8s_kubernetes.{action}_object manifest="{example_manifest}"
        salt-call metalk8s_kubernetes.{action}_object name="bootstrap" kind="Node" apiVersion="v1"
        salt-call metalk8s_kubernetes.{action}_object name="coredns-123" kind="Pod" apiVersion="v1" namespace="kube-system"
        """
    elif action == "patch":
        example_manifest = {
            "kind": "Node",
            "apiVersion": "v1",
            "metadata": {"name": "bootstrap", "labels": {"test.12": "foo"}},
        }
        patch1 = {"metadata": {"labels": {"test.12": "bar"}}}
        patch2 = [{"op": "remove", "path": "/metadata/labels/test.12"}]
        method.__doc__ = f"""{base_doc}
    Ability to {action} an object using object description and a patch 'name',
    'kind', 'apiVersion' and 'patch'.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.update_object name=/root/patch.yaml
        salt-call metalk8s_kubernetes.update_object manifest="{example_manifest}"
        salt-call metalk8s_kubernetes.update_object name="bootstrap" kind="Node" apiVersion="v1" patch="{patch1}"
        salt-call metalk8s_kubernetes.update_object name="bootstrap" kind="Node" apiVersion="v1" patch="{patch2}"
        """

    return method


create_object = _object_manipulation_function("create")
delete_object = _object_manipulation_function("delete")
replace_object = _object_manipulation_function("replace")
get_object = _object_manipulation_function("get")
update_object = _object_manipulation_function("patch")


# Check if a specific object exists
def object_exists(kind, apiVersion, name, **kwargs):
    """
    Simple helper to check if an object exists or not

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.object_exists kind="Node" apiVersion="v1" name="MyNode"
    """
    return get_object(kind=kind, apiVersion=apiVersion, name=name, **kwargs) is not None


# Equivalent of "kubectl rollout restart"
def rollout_restart(*args, **kwargs):
    """
    Simple helper to trigger a rollout restart of Deployment, DaemonSet, ...

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.rollout_restart kind="Deployment" apiVersion="apps/v1" name="MyDeployment" namespace="default"
    """
    patch = {
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {
                        "kubectl.kubernetes.io/restartedAt": datetime.now().isoformat()
                    }
                }
            }
        }
    }

    return update_object(patch=patch, *args, **kwargs)


# Listing resources can benefit from a simpler signature
def list_objects(
    kind,
    apiVersion,
    namespace="default",
    all_namespaces=False,
    field_selector=None,
    label_selector=None,
    **kwargs,
):
    """
    List all objects of a type using some object description.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.list_objects kind="Pod" apiVersion="v1"
        salt-call metalk8s_kubernetes.list_objects kind="Pod" apiVersion="v1" namespace="kube-system"
        salt-call metalk8s_kubernetes.list_objects kind="Pod" apiVersion="v1" all_namespaces=True field_selector="spec.nodeName=bootstrap"
    """
    kubeconfig, context = __salt__["metalk8s_kubernetes.get_kubeconfig"](**kwargs)

    client = __utils__["metalk8s_kubernetes.get_client"](kubeconfig, context)
    try:
        api = client.resources.get(api_version=apiVersion, kind=kind)
    except ResourceNotFoundError as exc:
        raise CommandExecutionError(
            f"Kind '{kind}' from apiVersion '{apiVersion}' is unknown"
        ) from exc
    api = client.resources.get(api_version=apiVersion, kind=kind)

    call_kwargs = {}
    if all_namespaces:
        call_kwargs["all_namespaces"] = True
    elif api.namespaced:
        call_kwargs["namespace"] = namespace
    if field_selector:
        call_kwargs["field_selector"] = field_selector
    if label_selector:
        call_kwargs["label_selector"] = label_selector

    try:
        result = api.get(**call_kwargs)
    except (ApiException, HTTPError) as exc:
        base_msg = f'Failed to list resources "{apiVersion}/{kind}"'
        if "namespace" in call_kwargs:
            base_msg += f' in namespace "{namespace}"'
        raise CommandExecutionError(base_msg) from exc

    return result.to_dict()["items"]


def get_object_digest(
    path=None, checksum="sha256", ignore_not_found=False, *args, **kwargs
):
    """
    Helper to get the digest of one kubernetes object or from a specific key
    of this object using a path
    (usefull to get the digest of one config from ConfigMap)

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.get_object_digest kind="ConfigMap" apiVersion="v1" name="my-config-map" path="data:config.yaml"
        salt-call metalk8s_kubernetes.get_object_digest kind="Pod" apiVersion="v1" name="my-pod"
    """
    obj = get_object(*args, **kwargs)

    if not obj:
        raise CommandExecutionError("Unable to find the object")

    if path:
        obj = salt.utils.data.traverse_dict_and_list(obj, path, delimiter=":")

        if not obj:
            if not ignore_not_found:
                raise CommandExecutionError(
                    f'Unable to find key "{path}" in the object'
                )
            return ""

    if isinstance(obj, dict):
        obj = json.dumps(obj, sort_keys=True)

    return __salt__.hashutil.digest(str(obj), checksum=checksum)


def _has_ca_injected_by_cert_manager(obj):
    """Tell whether cert-manager cainjector injects the CA bundle of `obj`."""
    annotations = obj["metadata"].get("annotations") or {}
    return (
        "cert-manager.io/inject-ca-from" in annotations
        or "cert-manager.io/inject-ca-from-secret" in annotations
        or annotations.get("cert-manager.io/inject-apiserver-ca") == "true"
    )


def check_object_ready(*args, **kwargs):
    """
    Check that an Object is Ready, depending on object Kind

    A Mutating or ValidatingWebhookConfiguration has no status. When
    cert-manager injects its CA bundle, it is considered Ready once every
    webhook has one. Otherwise, it is Ready right away: without a CA bundle,
    the API server verifies the webhooks with its system trust roots.

    A CustomResourceDefinition has no Ready condition, it is considered Ready
    once Established, that is once the API server serves its resources.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.check_object_ready kind="Pod" apiVersion="v1" name="my-pod"
        salt-call metalk8s_kubernetes.check_object_ready kind="Deployment" apiVersion="apps/v1" name="my-deploy" namespace="kube-system"
        salt-call metalk8s_kubernetes.check_object_ready kind="ValidatingWebhookConfiguration" apiVersion="admissionregistration.k8s.io/v1" name="my-webhook"
        salt-call metalk8s_kubernetes.check_object_ready kind="CustomResourceDefinition" apiVersion="apiextensions.k8s.io/v1" name="my-crd"
    """
    obj = get_object(*args, **kwargs)

    if not obj:
        raise CommandExecutionError("Unable to find the object")

    return _check_object_ready(obj)


def _check_object_ready(obj):
    if (
        "observedGeneration" in (obj.get("status") or {})
        and obj["metadata"]["generation"] != obj["status"]["observedGeneration"]
    ):
        raise CommandExecutionError("Object has not been updated yet")

    # NOTE: Only some kinds have a specific case. Any other object is expected
    # to have a Ready condition.
    if obj["kind"] == "Deployment":
        # Replicas counters are omitted from the status while they are 0,
        # e.g. on a Deployment that has just been created
        status = obj.get("status") or {}
        if (
            status.get("updatedReplicas", 0) != obj["spec"]["replicas"]
            or status.get("replicas", 0) != obj["spec"]["replicas"]
            or status.get("availableReplicas", 0) != obj["spec"]["replicas"]
        ):
            raise CommandExecutionError("All the Deployment replicas are not yet Ready")
    elif obj["kind"] in [
        "MutatingWebhookConfiguration",
        "ValidatingWebhookConfiguration",
    ]:
        if _has_ca_injected_by_cert_manager(obj) and not all(
            (webhook.get("clientConfig") or {}).get("caBundle")
            for webhook in obj.get("webhooks") or []
        ):
            raise CommandExecutionError("Some webhooks do not have a CA bundle yet")
    elif obj["kind"] == "CustomResourceDefinition":
        if not any(
            cond["type"] == "Established" and cond["status"] == "True"
            for cond in (obj.get("status") or {}).get("conditions") or []
        ):
            raise CommandExecutionError(
                "The CustomResourceDefinition is not yet Established"
            )
    else:
        try:
            condition = next(
                cond for cond in obj["status"]["conditions"] if cond["type"] == "Ready"
            )
        except (KeyError, StopIteration) as exc:
            raise CommandExecutionError(
                "Unable to find the object Ready condition"
            ) from exc

        if (
            "observedGeneration" in condition
            and obj["metadata"]["generation"] != condition["observedGeneration"]
        ):
            raise CommandExecutionError("Object has not been updated yet")

        if condition["status"] != "True":
            raise CommandExecutionError("Object is not yet Ready")

    return True


def is_object_ready(*args, **kwargs):
    """
    Return whether an Object exists and is Ready, see `check_object_ready`

    Unlike `check_object_ready`, it does not raise when the object is missing
    or not Ready, so that it can be used when rendering a template.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_kubernetes.is_object_ready kind="CustomResourceDefinition" apiVersion="apiextensions.k8s.io/v1" name="my-crd"
    """
    obj = get_object(*args, **kwargs)

    if not obj:
        return False

    try:
        return _check_object_ready(obj)
    except CommandExecutionError:
        return False
