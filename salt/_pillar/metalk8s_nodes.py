import os.path
import logging

from salt.exceptions import CommandExecutionError


VERSION_LABEL = "metalk8s.scality.com/version"
ROLE_LABEL_PREFIX = "node-role.kubernetes.io/"


log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_nodes"


def __virtual__():
    if "metalk8s_kubernetes.get_object" not in __salt__:
        return False, "Missing metalk8s_kubernetes module"
    else:
        return __virtualname__


def node_info(node, ca_minion):
    result = {
        "roles": [],
        "version": None,
    }

    roles = set()

    if VERSION_LABEL in node["metadata"]["labels"]:
        result["version"] = node["metadata"]["labels"][VERSION_LABEL]

    for label in node["metadata"]["labels"].keys():
        if label.startswith(ROLE_LABEL_PREFIX):
            role = label[len(ROLE_LABEL_PREFIX) :]
            if role:
                roles.add(role)

    if node["metadata"]["name"] == ca_minion:
        roles.add("ca")

    result["roles"] = list(roles)

    return result


def get_cluster_version(kubeconfig=None):
    try:
        namespace = __salt__["metalk8s_kubernetes.get_object"](
            name="kube-system", kind="Namespace", apiVersion="v1", kubeconfig=kubeconfig
        )
    except CommandExecutionError as exc:
        return __utils__["pillar_utils.errors_to_dict"](
            "Unable to read namespace information {}".format(exc)
        )
    annotations = namespace["metadata"].get("annotations", {})
    annotation_key = "metalk8s.scality.com/cluster-version"
    if not annotations or annotation_key not in annotations:
        return __utils__["pillar_utils.errors_to_dict"](
            "Unable to retrieve cluster version"
        )

    return annotations[annotation_key]


def get_cluster_config(kubeconfig=None):
    try:
        return __salt__["metalk8s_kubernetes.get_object"](
            name="main",
            kind="ClusterConfig",
            apiVersion="metalk8s.scality.com/v1alpha1",
            kubeconfig=kubeconfig,
        )
    except CommandExecutionError as exc:
        return __utils__["pillar_utils.errors_to_dict"](
            f"Unable to read ClusterConfig information {exc}"
        )


def get_storage_classes(kubeconfig=None):
    storage_classes = {}
    storageclass_list = __salt__["metalk8s_kubernetes.list_objects"](
        kind="StorageClass", apiVersion="storage.k8s.io/v1", kubeconfig=kubeconfig
    )
    for storageclass in storageclass_list:
        storage_classes[storageclass["metadata"]["name"]] = storageclass

    return storage_classes


def list_volumes(minion_id, kubeconfig=None):
    try:
        storage_classes = get_storage_classes(kubeconfig=kubeconfig)
    except CommandExecutionError as exc:
        return __utils__["pillar_utils.errors_to_dict"](
            ["Unable to retrieve list of storage class: {}".format(exc)]
        )

    try:
        volumes = __salt__["metalk8s_kubernetes.list_objects"](
            kind="Volume",
            apiVersion="storage.metalk8s.scality.com/v1alpha1",
            kubeconfig=kubeconfig,
        )
    except CommandExecutionError as exc:
        return __utils__["pillar_utils.errors_to_dict"](
            ["Unable to retrieve list of Volumes: {}".format(exc)]
        )

    results = {}
    local_volumes = (
        volume for volume in volumes if volume["spec"]["nodeName"] == minion_id
    )
    for volume in local_volumes:
        name = volume["metadata"]["name"]
        storageclass = storage_classes.get(
            volume["spec"]["storageClassName"], volume["spec"]["storageClassName"]
        )
        volume["spec"]["storageClass"] = storageclass
        name = volume["metadata"]["name"]
        results[name] = volume

    return results


def ext_pillar(minion_id, pillar, kubeconfig):
    if not os.path.isfile(kubeconfig):
        error_tplt = "{}: kubeconfig not found at {}"
        pillar_nodes = __utils__["pillar_utils.errors_to_dict"](
            [error_tplt.format(__virtualname__, kubeconfig)]
        )
        cluster_version = pillar_nodes
        cluster_config = pillar_nodes
        volume_information = pillar_nodes

    else:
        ca_minion = None
        if "metalk8s" in pillar:
            if "ca" in pillar["metalk8s"]:
                ca_minion = pillar["metalk8s"]["ca"].get("minion", None)

        try:
            node_list = __salt__["metalk8s_kubernetes.list_objects"](
                kind="Node", apiVersion="v1", kubeconfig=kubeconfig
            )
        except CommandExecutionError as exc:
            log.exception("Failed to retrieve nodes for ext_pillar", exc_info=exc)
            pillar_nodes = __utils__["pillar_utils.errors_to_dict"](
                ["Failed to retrieve NodeList: {!s}".format(exc)]
            )
        else:
            log.debug("Successfully retrieved nodes for ext_pillar")
            pillar_nodes = dict(
                (node["metadata"]["name"], node_info(node, ca_minion))
                for node in node_list
            )

        cluster_version = get_cluster_version(kubeconfig=kubeconfig)
        cluster_config = get_cluster_config(kubeconfig=kubeconfig)
        volume_information = list_volumes(minion_id, kubeconfig=kubeconfig)

    result = {
        "metalk8s": {
            "nodes": pillar_nodes,
            "cluster_version": cluster_version,
            "cluster_config": cluster_config,
            "volumes": volume_information,
        },
    }
    for key in ["nodes", "volumes"]:
        __utils__["pillar_utils.promote_errors"](result["metalk8s"], key)

    return result
