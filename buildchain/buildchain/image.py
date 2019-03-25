# coding: utf-8


"""Tasks to put container images on the ISO.

This module provides two services:
- building an image from a local Dockerfile
- downloading a prebuilt image from a registry

In either cases, those images are saved in a specific directory under the
ISO's root.

Overview:

                                  ┌───────────┐
                            ╱────>│pull:image1│
                 ┌────────┐╱      └───────────┘
                 │        │       ┌───────────┐
             ───>│  pull  │──────>│pull:image2│
            ╱    │        │       └───────────┘
┌─────────┐╱     └────────┘╲      ┌───────────┐
│         │                 ╲────>│pull:image3│
│  mkdir  │                       └───────────┘
│         │
└─────────┘╲     ┌────────┐
            ╲    │        │       ┌────────────┐
             ───>│  build │──────>│build:image3│
                 │        │       └────────────┘
                 └────────┘
"""


from pathlib import Path
from typing import Iterator, Tuple

from buildchain import constants
from buildchain import coreutils
from buildchain import targets
from buildchain import types
from buildchain import utils


# Root for the images on the ISO.
ISO_IMAGE_ROOT : Path = constants.ISO_ROOT/'images'


def task_images() -> types.TaskDict:
    """Pull/Build the container images."""
    return {
        'actions': None,
        'task_dep': [
            '_image_mkdir_root',
            '_image_pull',
            '_image_build',
        ],
    }


def task__image_mkdir_root() -> types.TaskDict:
    """Create the images root directory."""
    return targets.Mkdir(
        directory=ISO_IMAGE_ROOT, task_dep=['_iso_mkdir_root']
    ).task


def task__image_pull() -> Iterator[types.TaskDict]:
    """Download the container images."""
    for image in TO_PULL:
        yield image.task


def task__image_build() -> Iterator[types.TaskDict]:
    """Download the container images."""
    for image in TO_BUILD:
        yield image.task


NGINX_IMAGE_VERSION : str = '1.15.8'


# List of container images to pull.
#
# Digests are quite a mouthful, so:
# pylint:disable=line-too-long
TO_PULL : Tuple[targets.RemoteImage, ...] = (
    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='coredns',
        version='1.3.1',
        digest='sha256:02382353821b12c21b062c59184e227e001079bb13ebd01f9d3270ba0fcbf1e4',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='etcd',
        version='3.2.18',
        digest='sha256:b960569ade5f37205a033dcdc3191fe99dc95b15c6795a6282859070ec2c6124',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='kube-apiserver',
        version=constants.K8S_VERSION,
        digest='sha256:79b197b6a7334d2ad01ee82a9be82a39bfb50e33bc03263c58c4dfc4e81f71bc',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='kube-controller-manager',
        version=constants.K8S_VERSION,
        digest='sha256:bbb51bf83c73dfe8a924fd5f9e58f92c3feec44b24936f10b0087e8ffcd55f69',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='kube-proxy',
        version=constants.K8S_VERSION,
        digest='sha256:8886e69a7946717a88cad9882e9b44927798d154088be19b5116a375c9923036',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry=constants.GOOGLE_REGISTRY,
        name='kube-scheduler',
        version=constants.K8S_VERSION,
        digest='sha256:7a2a2a54f26647a4d8642d9158122e6c80e19b2b79d5bf0c74445f2e26a83dfa',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry='calico',
        name='calico-node',
        remote_name='node',
        version='3.5.1',
        digest='sha256:5baaa4795256e4f14c03fdccc534d46c2d7ff3ac84e748bacf88b1fa8c25d952',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry=constants.DOCKER_REGISTRY,
        name='nginx',
        version=NGINX_IMAGE_VERSION,
        digest='sha256:dd2d0ac3fff2f007d99e033b64854be0941e19a2ad51f174d9240dda20d9f534',
        destination=ISO_IMAGE_ROOT,
        task_dep=['_image_mkdir_root'],
    ),
    targets.RemoteImage(
        registry=constants.DOCKER_REGISTRY,
        name='registry',
        version='2.7.1',
        digest='sha256:870474507964d8e7d8c3b53bcfa738e3356d2747a42adad26d0d81ef4479eb1b',
        destination=ISO_IMAGE_ROOT,
        for_containerd=True,
        task_dep=['_image_mkdir_root'],
    ),
)


# The build ID is to be augmented whenever we rebuild the `salt-master` image,
# e.g. because the `Dockerfile` is changed, or one of the dependencies installed
# in the image needs to be updated.
# This should be reset to 1 when SALT_VERSION is changed.
SALT_MASTER_BUILD_ID : int = 1

# List of container images to build.
TO_BUILD : Tuple[targets.LocalImage, ...] = (
    targets.LocalImage(
        name='salt-master',
        version='{}-{}'.format(constants.SALT_VERSION, SALT_MASTER_BUILD_ID),
        dockerfile=constants.ROOT/'images'/'salt-master'/'Dockerfile',
        destination=ISO_IMAGE_ROOT,
        save_on_disk=True,
        build_args={'SALT_VERSION': constants.SALT_VERSION},
        task_dep=['_image_mkdir_root'],
    ),
    targets.LocalImage(
        name='metalk8s-ui',
        version='0.2',
        dockerfile=constants.ROOT/'ui'/'Dockerfile',
        destination=ISO_IMAGE_ROOT,
        save_on_disk=True,
        build_args={'NGINX_IMAGE_VERSION': NGINX_IMAGE_VERSION},
        task_dep=['_image_mkdir_root'],
        file_dep=list(coreutils.ls_files_rec(constants.ROOT/'ui')),
    ),
)


__all__ = utils.export_only_tasks(__name__)
