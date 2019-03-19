# coding: utf-8


"""Tasks for the ISO generation.

This module handles the creation of the final ISO, which involves:
- creating the ISO's root
- populating the ISO's tree
- creating the ISO
- computing the ISO's checksum

Overview:

                                ┌─────────────┐
                        ┌──────>│   images    │────────┐
                        │       └─────────────┘        │
                        │       ┌─────────────┐        │
                ┌────────┐ ╱───>│  packaging  │────╲   v
┌───────┐       │        │╱     └─────────────┘    ┌─────────┐    ┌──────────┐
│ mkdir │──────>│populate│                         │ mkisofs │───>│ checksum │
└───────┘       │        │╲     ┌─────────────┐    └─────────┘    └──────────┘
                └────────┘ ╲───>│  salt_tree  │────╱   ^
                        │       └─────────────┘        │
                        │       ┌─────────────┐        │
                        └──────>│ product.txt │────────┘
                                └─────────────┘
"""


from buildchain import constants
from buildchain import targets as helper
from buildchain import utils


def task_iso() -> dict:
    """Build the MetalK8s image."""
    return {
        'actions': None,
        'task_dep': [
            '_iso_mkdir_root',
            'populate_iso',
        ],
    }


def task__iso_mkdir_root() -> dict:
    """Create the ISO root directory."""
    return helper.Mkdir(
        directory=constants.ISO_ROOT, task_dep=['_build_root']
    ).task


def task_populate_iso() -> dict:
    """Populate the ISO_ROOT with required files."""

    doc = 'Populate {} with required files.'.format(
        utils.build_relpath(constants.ISO_ROOT)
    )
    return {
        'basename': 'populate_iso',
        'actions': None,
        'doc': doc,
        # Aggregate here the tasks that put files into ISO_ROOT.
        'task_dep': [
            '_iso_mkdir_root',
        ],
    }


__all__ = utils.export_only_tasks(__name__)
