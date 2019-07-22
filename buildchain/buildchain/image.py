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
from typing import Any, Dict, FrozenSet, Iterator, List, Tuple

from buildchain import config
from buildchain import constants
from buildchain import coreutils
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import versions


def task_images() -> types.TaskDict:
    """Pull/Build the container images."""
    return {
        'actions': None,
        'task_dep': [
            '_image_mkdir_root',
            '_image_pull',
            '_image_build',
            '_image_dedup_layers',
        ],
    }


def task__image_mkdir_root() -> types.TaskDict:
    """Create the images root directory."""
    return targets.Mkdir(
        directory=constants.ISO_IMAGE_ROOT, task_dep=['_iso_mkdir_root']
    ).task


def task__image_pull() -> Iterator[types.TaskDict]:
    """Download the container images."""
    for image in TO_PULL:
        yield image.task


def task__image_build() -> Iterator[types.TaskDict]:
    """Download the container images."""
    for image in TO_BUILD:
        yield image.task


def task__image_dedup_layers() -> types.TaskDict:
    """De-duplicate the images' layers with hard links."""
    def show() -> str:
        return '{cmd: <{width}} {path}'.format(
            cmd='HARDLINK', width=constants.CMD_WIDTH,
            path=utils.build_relpath(constants.ISO_IMAGE_ROOT)
        )

    task = targets.Target(
        task_dep=['check_for:hardlink', '_image_pull', '_image_build']
    ).basic_task
    task['title']   = lambda _: show()
    task['actions'] = [
        [config.ExtCommand.HARDLINK.value, '-c', constants.ISO_IMAGE_ROOT]
    ]
    return task

# Helpers {{{
def _get_image_info(name: str) -> versions.Image:
    """Retrieve an `Image` information by name from the versions listing."""
    try:
        return versions.CONTAINER_IMAGES_MAP[name]
    except KeyError:
        raise ValueError(
            'Missing version for container image "{}"'.format(name)
        )

def _remote_image(
    name: str, repository: str, **overrides: Any
) -> targets.RemoteImage:
    """Build a `RemoteImage` from a name and a repository.

    Provides sane defaults, relies on the `REMOTE_NAMES` and `SAVE_AS_TAR`
    constants to add some arguments.
    """
    overrides.setdefault('destination', constants.ISO_IMAGE_ROOT)
    overrides.setdefault('task_dep', ['_image_mkdir_root'])

    image_info = _get_image_info(name)
    kwargs = dict(image_info._asdict(), repository=repository, **overrides)

    if name in REMOTE_NAMES:
        kwargs['remote_name'] = REMOTE_NAMES[name]

    if name in SAVE_AS_TAR:
        kwargs['save_as_tar'] = True

    return targets.RemoteImage(**kwargs)

def _local_image(name: str, **kwargs: Any) -> targets.LocalImage:
    """Build a `LocalImage` from its name, with sane defaults.

    Build-specific information is left to the caller, as each image will
    require its own set of particularities.
    """
    image_info = _get_image_info(name)

    kwargs.setdefault('destination', constants.ISO_IMAGE_ROOT)
    kwargs.setdefault('dockerfile', constants.ROOT/'images'/name/'Dockerfile')
    kwargs.setdefault('save_on_disk', True)
    kwargs.setdefault('task_dep', ['_image_mkdir_root'])

    return targets.LocalImage(
        name=name,
        version=image_info.version,
        **kwargs,
    )

# }}}
# Container images to pull {{{
TO_PULL : List[targets.RemoteImage] = []

IMGS_PER_REPOSITORY : Dict[str, List[str]] = {
    constants.CALICO_REPOSITORY: [
        'calico-node',
        'calico-kube-controllers',
    ],
    constants.COREOS_REPOSITORY: [
        'configmap-reload',
        'kube-rbac-proxy',
        'kube-state-metrics',
        'prometheus-config-reloader',
        'prometheus-operator',
    ],
    constants.DOCKER_REPOSITORY: [
        'nginx',
    ],
    constants.GOOGLE_REPOSITORY: [
        'addon-resizer',
        'coredns',
        'etcd',
        'kube-apiserver',
        'kube-controller-manager',
        'kube-proxy',
        'kube-scheduler',
        'nginx-ingress-defaultbackend-amd64',
    ],
    constants.GRAFANA_REPOSITORY: [
        'grafana',
    ],
    constants.INGRESS_REPOSITORY: [
        'nginx-ingress-controller',
    ],
    constants.PROMETHEUS_REPOSITORY: [
        'alertmanager',
        'node-exporter',
        'prometheus',
    ],
}

REMOTE_NAMES : Dict[str, str] = {
    'calico-node': 'node',
    'calico-kube-controllers': 'kube-controllers',
    'nginx-ingress-defaultbackend-amd64': 'defaultbackend-amd64',
}

SAVE_AS_TAR : FrozenSet[str] = frozenset(('nginx', 'pause'))

for repo, images in IMGS_PER_REPOSITORY.items():
    for image_name in images:
        TO_PULL.append(_remote_image(image_name, repo))

# }}}
# Container images to build {{{
TO_BUILD : Tuple[targets.LocalImage, ...] = (
    _local_image(
        name='salt-master',
        build_args={'SALT_VERSION': versions.SALT_VERSION},
        file_dep=[constants.ROOT/'images'/'salt-master'/'source.key'],
    ),
    _local_image(
        name='keepalived',
        build_args={
            'KEEPALIVED_IMAGE': versions.CENTOS_BASE_IMAGE,
            'KEEPALIVED_IMAGE_SHA256': versions.CENTOS_BASE_IMAGE_SHA256,
            'KEEPALIVED_VERSION': versions.KEEPALIVED_VERSION,
            'BUILD_DATE': datetime.datetime.now(datetime.timezone.utc)
                            .astimezone()
                            .isoformat(),
            'VCS_REF': constants.GIT_REF or '<unknown>',
            'VERSION': versions.CONTAINER_IMAGES_MAP['keepalived'].version,
            'METALK8S_VERSION': versions.VERSION,
        },
        file_dep=[constants.ROOT/'images'/'keepalived'/'entrypoint.sh'],
    ),
    _local_image(
        name='metalk8s-ui',
        dockerfile=constants.ROOT/'ui'/'Dockerfile',
        build_args={
            'NGINX_IMAGE_VERSION': versions.NGINX_IMAGE_VERSION,
            'NODE_IMAGE_VERSION': versions.NODEJS_IMAGE_VERSION,
        },
        file_dep=(
            list(coreutils.ls_files_rec(constants.ROOT/'ui'/'public')) +
            list(coreutils.ls_files_rec(constants.ROOT/'ui'/'src')) +
            [
                constants.ROOT/'ui'/'package.json',
                constants.ROOT/'ui'/'package-lock.json',
                constants.ROOT/'ui'/'conf'/'nginx.conf'
            ]
        )
    ),
    _local_image(
        name='metalk8s-utils',
        build_args={
            'BASE_IMAGE': versions.CENTOS_BASE_IMAGE,
            'BASE_IMAGE_SHA256': versions.CENTOS_BASE_IMAGE_SHA256,
            'BUILD_DATE': datetime.datetime.now(datetime.timezone.utc)
                            .astimezone()
                            .isoformat(),
            'VCS_REF': constants.GIT_REF or '<unknown>',
            'METALK8S_VERSION': versions.VERSION,
        },
    ),
)
# }}}


__all__ = utils.export_only_tasks(__name__)
