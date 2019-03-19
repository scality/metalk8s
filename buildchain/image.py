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

from buildchain import constants
from buildchain import targets
from buildchain import utils


# Root for the images on the ISO.
ISO_IMAGE_ROOT : Path = constants.ISO_ROOT/'images'


def task_images() -> dict:
    """Pull/Build the container images."""
    return {
        'actions': None,
        'task_dep': [
            '_image_mkdir_root',
        ],
    }


def task__image_mkdir_root() -> dict:
    """Create the images root directory."""
    return targets.Mkdir(
        directory=ISO_IMAGE_ROOT, task_dep=['_iso_mkdir_root']
    ).task


__all__ = utils.export_only_tasks(__name__)
