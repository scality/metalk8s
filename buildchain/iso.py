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


import datetime as dt
import socket
import subprocess
from typing import Sequence

from buildchain import config
from buildchain import constants
from buildchain import targets as helper
from buildchain import utils


def task_iso() -> dict:
    """Build the MetalK8s image."""
    return {
        'actions': None,
        'task_dep': [
            '_iso_mkdir_root',
            '_iso_populate',
        ],
    }


def task__iso_mkdir_root() -> dict:
    """Create the ISO root directory."""
    return helper.Mkdir(
        directory=constants.ISO_ROOT, task_dep=['_build_root']
    ).task


def task__iso_populate() -> dict:
    """Populate the ISO_ROOT with required files."""
    return {
        'basename': '_iso_populate',
        'actions': None,
        'doc': 'Populate {} with required files.'.format(
            utils.build_relpath(constants.ISO_ROOT)
        ),
        # Aggregate here the tasks that put files into ISO_ROOT.
        'task_dep': [
            '_iso_mkdir_root',
            '_iso_render_bootstrap',
            '_iso_generate_product_txt',
        ],
    }


def task__iso_render_bootstrap() -> dict:
    """Generate the bootstrap script."""
    return helper.TemplateFile(
        source=constants.ROOT/'scripts'/'bootstrap.sh.in',
        destination=constants.ISO_ROOT/'bootstrap.sh',
        context={'VERSION': constants.SHORT_VERSION},
        file_dep=[constants.VERSION_FILE],
        task_dep=['_iso_mkdir_root'],
    ).task


def task__iso_generate_product_txt() -> dict:
    """Generate the product.txt file."""
    def action(targets: Sequence[str]) -> None:
        datefmt = "%Y-%m-%dT%H:%M:%SZ"
        dev_release = '1' if constants.VERSION_SUFFIX == '-dev' else '0'
        info = (
            ('NAME', config.PROJECT_NAME),
            ('VERSION', constants.VERSION),
            ('SHORT_VERSION', constants.SHORT_VERSION),
            ('GIT', git_revision()),
            ('DEVELOPMENT_RELEASE', dev_release),
            ('BUILD_TIMESTAMP', dt.datetime.utcnow().strftime(datefmt)),
            ('BUILD_HOST', socket.gethostname()),
        )
        with open(targets[0], 'w', encoding='utf-8') as fp:
            data = '\n'.join('{}={}'.format(key, value) for key, value in info)
            fp.write(data)
            fp.write('\n')

    return {
        'title': lambda task: utils.title_with_target1('GENERATE', task),
        'actions': [action],
        'targets': [constants.ISO_ROOT/'product.txt'],
        'file_dep': [constants.VERSION_FILE],
        'task_dep': ['_iso_mkdir_root'],
        'uptodate': [False],  # False because we include the build timestamp.
        'clean': True,
    }


def git_revision() -> str:
    """Return the current git revision.

    Return an empty string if we can't get the information.
    """
    git_cmd = [
        config.GIT, 'describe', '--long', '--always', '--tags', '--dirty'
    ]
    try:
        stdout : bytes = subprocess.check_output(git_cmd)
        return stdout.decode('utf-8').rstrip()
    except subprocess.CalledProcessError:
        return ''


__all__ = utils.export_only_tasks(__name__)
