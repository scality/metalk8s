# coding: utf-8

"""Tasks to put container images on the ISO.

This module provides two services:
- building an image from a local Dockerfile
- downloading a prebuilt image from a registry

In either cases, those images are saved in a specific directory under the
ISO's root.

Overview:

                                  ┌───────────┐
                            ╱────>│pull:image1│───────     ┌─────────┐
                 ┌────────┐╱      └───────────┘       ╲    │         │
                 │        │       ┌───────────┐        ╲   │  dedup  │
             ───>│  pull  │──────>│pull:image2│───────────>│  layers │
            ╱    │        │       └───────────┘        ╱   │         │
┌─────────┐╱     └────────┘╲      ┌───────────┐       ╱    └─────────┘
│         │                 ╲────>│pull:image3│───────      ╱
│  mkdir  │                       └───────────┘            ╱
│         │                                               ╱
└─────────┘╲     ┌────────┐                              ╱
            ╲    │        │       ┌────────────┐        ╱
             ───>│  build │──────>│build:image3│───────╱
                 │        │       └────────────┘
                 └────────┘
"""


import datetime
from typing import Any, Dict, Iterator, List, Tuple

from buildchain import builder
from buildchain import config
from buildchain import constants
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import versions


def task_images() -> types.TaskDict:
    """Pull/Build the container images."""
    return {
        "actions": None,
        "task_dep": [
            "_image_mkdir_root",
            "_image_pull",
            "_image_build",
            "_image_dedup_layers",
        ],
    }


def task__image_mkdir_root() -> types.TaskDict:
    """Create the images root directory."""
    return targets.Mkdir(
        directory=constants.ISO_IMAGE_ROOT, task_dep=["_iso_mkdir_root"]
    ).task


def task__image_pull() -> Iterator[types.TaskDict]:
    """Download the container images."""
    for image in TO_PULL.values():
        yield image.task


def task__image_build() -> Iterator[types.TaskDict]:
    """Build the container images."""
    for image in TO_BUILD:
        yield image.task


def task__image_calc_build_deps() -> Iterator[types.TaskDict]:
    """Compute dependencies from the Dockerfile of locally built images."""
    for image in TO_BUILD:
        yield image.calc_deps_task
    for builder_image in builder.BUILDERS:
        yield builder_image.calc_deps_task


def task__image_dedup_layers() -> types.TaskDict:
    """De-duplicate the images' layers with hard links."""

    def show() -> str:
        return (
            f"{'HARDLINK': <{constants.CMD_WIDTH}} "
            f"{utils.build_relpath(constants.ISO_IMAGE_ROOT)}"
        )

    task = targets.Target(
        task_dep=["check_for:hardlink", "_image_pull", "_image_build"]
    ).basic_task
    task["title"] = lambda _: show()
    task["actions"] = [
        [config.ExtCommand.HARDLINK.value, "-c", constants.ISO_IMAGE_ROOT]
    ]
    return task


# Helpers {{{
def _get_image_info(name: str) -> versions.Image:
    """Retrieve an `Image` information by name from the versions listing."""
    try:
        return versions.CONTAINER_IMAGES_MAP[name]
    except KeyError as exc:
        raise ValueError(f'Missing version for container image "{name}"') from exc


def _remote_image(name: str, repository: str, **overrides: Any) -> targets.RemoteImage:
    """Build a `RemoteImage` from a name and a repository.

    Provides sane defaults, relies on the `REMOTE_NAMES` and `SAVE_AS`
    constants to add some arguments.
    """
    overrides.setdefault("destination", constants.ISO_IMAGE_ROOT)
    overrides.setdefault("task_dep", []).append("_image_mkdir_root")

    image_info = _get_image_info(name)
    kwargs = dict(
        image_info._asdict(),
        repository=repository,
        save_as=SAVE_AS.get(name, None),
        **overrides,
    )

    if name in REMOTE_NAMES:
        kwargs["remote_name"] = REMOTE_NAMES[name]

    return targets.RemoteImage(**kwargs)


def _local_image(name: str, **kwargs: Any) -> targets.LocalImage:
    """Build a `LocalImage` from its name, with sane defaults.

    Build-specific information is left to the caller, as each image will
    require its own set of particularities.
    """
    image_info = _get_image_info(name)

    kwargs.setdefault("destination", constants.ISO_IMAGE_ROOT)
    kwargs.setdefault("dockerfile", constants.ROOT / "images" / name / "Dockerfile")
    kwargs.setdefault("save_on_disk", True)
    kwargs.setdefault("task_dep", []).append("_image_mkdir_root")

    return targets.LocalImage(
        name=name,
        version=image_info.version,
        **kwargs,
    )


# }}}
# Container images to pull {{{
TO_PULL: Dict[str, targets.RemoteImage] = {}

IMGS_PER_REPOSITORY: Dict[str, List[str]] = {
    constants.CALICO_REPOSITORY: [
        "calico-cni",
        "calico-node",
        "calico-kube-controllers",
    ],
    constants.COREDNS_REPOSITORY: [
        "coredns",
    ],
    constants.DEX_REPOSITORY: [
        "dex",
    ],
    constants.DOCKER_REPOSITORY: [
        "alpine",
        "nginx",
    ],
    constants.FLUENT_REPOSITORY: [
        "fluent-bit",
    ],
    constants.GRAFANA_REPOSITORY: [
        "grafana",
        "loki",
    ],
    constants.INGRESS_REPOSITORY: [
        "nginx-ingress-controller",
    ],
    constants.K8S_REPOSITORY: [
        "pause",
        "etcd",
        "kube-apiserver",
        "kube-controller-manager",
        "kube-proxy",
        "kube-scheduler",
    ],
    constants.KIWIGRID_REPOSITORY: [
        "k8s-sidecar",
    ],
    constants.KUBE_STATE_METRICS_REPOSITORY: [
        "kube-state-metrics",
    ],
    constants.PROMETHEUS_ADAPTER_REPOSITORY: [
        "prometheus-adapter",
    ],
    constants.PROMETHEUS_OPERATOR_REPOSITORY: [
        "prometheus-config-reloader",
        "prometheus-operator",
    ],
    constants.PROMETHEUS_REPOSITORY: [
        "alertmanager",
        "node-exporter",
        "prometheus",
    ],
    constants.THANOS_REPOSITORY: [
        "thanos",
    ],
}

REMOTE_NAMES: Dict[str, str] = {
    "calico-cni": "cni",
    "calico-node": "node",
    "calico-kube-controllers": "kube-controllers",
    "nginx-ingress-controller": "controller",
}

SAVE_AS: Dict[str, List[targets.ImageSaveFormat]] = {
    "pause": [targets.SaveAsTar(), targets.SaveAsLayers()],
    "nginx": [targets.SaveAsTar(), targets.SaveAsLayers()],
}

for repo, images in IMGS_PER_REPOSITORY.items():
    for image_name in images:
        TO_PULL[image_name] = _remote_image(image_name, repo)

# }}}
# Container images to build {{{
TO_BUILD: Tuple[targets.LocalImage, ...] = (
    _local_image(
        name="metalk8s-alert-logger",
        build_args={
            "BASE_IMAGE": TO_PULL["alpine"].remote_fullname_digest,
        },
    ),
    _local_image(
        name="metalk8s-keepalived",
        build_args={
            "BASE_IMAGE": TO_PULL["alpine"].remote_fullname_digest,
            "BUILD_DATE": datetime.datetime.now(datetime.timezone.utc)
            .astimezone()
            .isoformat(),
            "VCS_REF": constants.GIT_REF or "<unknown>",
            "VERSION": versions.VERSION,
            "METALK8S_VERSION": versions.VERSION,
            "KEEPALIVED_VERSION": versions.KEEPALIVED_VERSION,
        },
    ),
    _local_image(
        name="salt-master",
        build_args={
            "BASE_IMAGE": versions.ROCKY_BASE_IMAGE,
            "BASE_IMAGE_SHA256": versions.ROCKY_BASE_IMAGE_SHA256,
            "SALT_VERSION": versions.SALT_VERSION,
        },
    ),
    _local_image(
        name="metalk8s-ui",
        build_context=targets.ExplicitContext(
            dockerfile=constants.ROOT / "images/metalk8s-ui/Dockerfile",
            base_dir=config.BUILD_ROOT,
            contents=[
                constants.UI_BUILD_ROOT.relative_to(config.BUILD_ROOT),
                constants.DOCS_BUILD_ROOT.relative_to(config.BUILD_ROOT),
                constants.SHELL_UI_BUILD_ROOT.relative_to(config.BUILD_ROOT),
                "metalk8s-ui-nginx.conf",
            ],
        ),
        build_args={
            "NGINX_IMAGE_VERSION": versions.NGINX_IMAGE_VERSION,
        },
        task_dep=["ui", "shell_ui", "doc"],
    ),
    _local_image(
        name="metalk8s-utils",
        build_args={
            "BASE_IMAGE": versions.ROCKY_BASE_IMAGE,
            "BASE_IMAGE_SHA256": versions.ROCKY_BASE_IMAGE_SHA256,
            "BUILD_DATE": datetime.datetime.now(datetime.timezone.utc)
            .astimezone()
            .isoformat(),
            "VCS_REF": constants.GIT_REF or "<unknown>",
            "METALK8S_VERSION": versions.VERSION,
            "SALT_VERSION": versions.SALT_VERSION,
            "K8S_SHORT_VERSION": versions.K8S_SHORT_VERSION,
            "K8S_VERSION": versions.K8S_VERSION,
            "ETCD_VERSION": f"v{versions.ETCD_VERSION}",
        },
    ),
    _local_image(
        name="metalk8s-operator",
        dockerfile=constants.METALK8S_OPERATOR_ROOT / "Dockerfile",
        build_context=constants.METALK8S_OPERATOR_ROOT,
        build_args={
            "BUILD_DATE": datetime.datetime.now(datetime.timezone.utc)
            .astimezone()
            .isoformat(),
            "VCS_REF": constants.GIT_REF or "<unknown>",
            "METALK8S_VERSION": versions.VERSION,
            "VERSION": versions.VERSION,
        },
    ),
    _local_image(
        name="storage-operator",
        dockerfile=constants.STORAGE_OPERATOR_ROOT / "Dockerfile",
        build_context=constants.STORAGE_OPERATOR_ROOT,
        build_args={
            "BUILD_DATE": datetime.datetime.now(datetime.timezone.utc)
            .astimezone()
            .isoformat(),
            "VCS_REF": constants.GIT_REF or "<unknown>",
            "METALK8S_VERSION": versions.VERSION,
            "VERSION": versions.VERSION,
        },
    ),
)
# }}}


__all__ = utils.export_only_tasks(__name__)
