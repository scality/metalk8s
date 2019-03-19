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
import os
import socket
import subprocess
from pathlib import Path
from typing import List, Sequence

import doit  # type: ignore

from buildchain import config
from buildchain import constants
from buildchain import targets as helper
from buildchain import utils


ISO_FILE : Path = config.BUILD_ROOT/'{}.iso'.format(config.PROJECT_NAME.lower())


def task_iso() -> dict:
    """Build the MetalK8s image."""
    return {
        'actions': None,
        'task_dep': [
            '_iso_mkdir_root',
            '_iso_populate',
            '_iso_build',
            '_iso_digest',
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
            'images',
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


@doit.create_after(executed='_iso_populate')  # type: ignore
def task__iso_build() -> dict:
    """Create the ISO from the files in ISO_ROOT."""
    mkisofs = [
        config.MKISOFS, '-output',  ISO_FILE,
        '-quiet',
        '-rock',
        '-joliet',
        '-joliet-long',
        '-full-iso9660-filenames',
        '-volid', '{} {}'.format(config.PROJECT_NAME, constants.VERSION),
        '--iso-level', '3',
        '-gid', '0',
        '-uid', '0',
        '-input-charset', 'utf-8',
        '-output-charset', 'utf-8',
        constants.ISO_ROOT
    ]
    doc = 'Create the ISO from the files in {}.'.format(
        utils.build_relpath(constants.ISO_ROOT)
    )
    # Every file used for the ISO is a dependency.
    depends = list_iso_files()
    depends.append(constants.VERSION_FILE)
    return {
        'title': lambda task: utils.title_with_target1('MKISOFS', task),
        'doc': doc,
        'actions': [mkisofs],
        'targets': [ISO_FILE],
        'file_dep': depends,
        'task_dep': ['_build_root', '_iso_mkdir_root'],
        'clean': True,
    }


def task__iso_digest() -> dict:
    """Compute the SHA256 digest of the ISO."""
    return helper.Sha256Sum(
        input_files=[ISO_FILE],
        output_file=config.BUILD_ROOT/'SHA256SUM',
        task_dep=['_iso_build']
    ).task


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


def list_iso_files() -> List[Path]:
    """List all the files under the ISO root."""
    res : List[Path] = []
    for root, _, files in os.walk(constants.ISO_ROOT):
        if not root.startswith(str(constants.ISO_ROOT)):
            continue
        root_path = Path(root)
        res.extend(root_path/filename for filename in files)
    return res


__all__ = utils.export_only_tasks(__name__)
