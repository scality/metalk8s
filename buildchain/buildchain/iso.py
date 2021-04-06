# coding: utf-8

# pylint:disable=line-too-long
"""Tasks for the ISO generation.

This module handles the creation of the final ISO, which involves:
- creating the ISO's root
- populating the ISO's tree
- creating the ISO
- inject the ISO data sectors checksum using 'isomd5sum'
- computing the ISO's checksum

Overview:

                                ┌───────────────┐
                        ┌──────>│    images     │────────┐
                        │       └───────────────┘        │
                        │       ┌───────────────┐        │
                ┌────────┐ ╱───>│   packaging   │────╲   v
┌───────┐       │        │╱     └───────────────┘    ┌─────────┐    ┌───────────────┐    ┌──────────┐
│ mkdir │──────>│populate│                           │ mkisofs │───>│ implantisomd5 │───>│ checksum │
└───────┘       │        │╲     ┌───────────────┐    └─────────┘    └───────────────┘    └──────────┘
                └────────┘ ╲───>│   salt_tree   │────╱   ^
                        │       └───────────────┘        │
                        │       ┌───────────────┐        │
                        ├──────>│    iso_tree   │────────┤
                        │       └───────────────┘        │
                        │       ┌───────────────┐        │
                        └──────>│ documentation │────────┘
                                └───────────────┘
"""


import datetime as dt
import socket
from pathlib import Path
from typing import Iterator, List, Tuple, Union

import doit  # type: ignore

from buildchain import action
from buildchain import config
from buildchain import constants
from buildchain import coreutils
from buildchain import targets as helper
from buildchain import types
from buildchain import utils
from buildchain import versions


ISO_FILE: Path = config.BUILD_ROOT / "{}.iso".format(config.PROJECT_NAME.lower())
FILE_TREES: Tuple[helper.FileTree, ...] = (
    helper.FileTree(
        basename="_iso_add_tree",
        files=(
            Path("examples/new-node.yaml"),
            Path("examples/new-node_vagrant.yaml"),
            Path("examples/prometheus-sparse.yaml"),
            Path("examples/loki-sparse.yaml"),
        ),
        destination_directory=constants.ISO_ROOT,
        task_dep=["_iso_mkdir_root"],
    ),
    helper.FileTree(
        basename="_iso_add_tree",
        files=(
            Path("iso-manager.sh"),
            Path("solutions.sh"),
            helper.TemplateFile(
                task_name="common.sh",
                source=constants.ROOT / "scripts" / "common.sh.in",
                destination=constants.ISO_ROOT / "common.sh",
                context={"VERSION": versions.VERSION},
                file_dep=[versions.VERSION_FILE],
                task_dep=["_iso_mkdir_root"],
            ),
            helper.TemplateFile(
                task_name="downgrade.sh",
                source=constants.ROOT / "scripts" / "downgrade.sh.in",
                destination=constants.ISO_ROOT / "downgrade.sh",
                context={"VERSION": versions.VERSION},
                file_dep=[versions.VERSION_FILE],
                task_dep=["_iso_mkdir_root"],
            ),
            helper.TemplateFile(
                task_name="upgrade.sh",
                source=constants.ROOT / "scripts" / "upgrade.sh.in",
                destination=constants.ISO_ROOT / "upgrade.sh",
                context={"VERSION": versions.VERSION},
                file_dep=[versions.VERSION_FILE],
                task_dep=["_iso_mkdir_root"],
            ),
            helper.TemplateFile(
                task_name="bootstrap.sh",
                source=constants.ROOT / "scripts" / "bootstrap.sh.in",
                destination=constants.ISO_ROOT / "bootstrap.sh",
                context={
                    "VERSION": versions.VERSION,
                    "SALT_VERSION": versions.SALT_VERSION,
                },
                file_dep=[versions.VERSION_FILE],
                task_dep=["_iso_mkdir_root"],
            ),
            helper.TemplateFile(
                task_name="backup.sh",
                source=constants.ROOT / "scripts" / "backup.sh.in",
                destination=constants.ISO_ROOT / "backup.sh",
                context={"VERSION": versions.VERSION},
                file_dep=[versions.VERSION_FILE],
                task_dep=["_iso_mkdir_root"],
            ),
            helper.TemplateFile(
                task_name="restore.sh",
                source=constants.ROOT / "scripts" / "restore.sh.in",
                destination=constants.ISO_ROOT / "restore.sh",
                context={
                    "VERSION": versions.VERSION,
                    "SALT_VERSION": versions.SALT_VERSION,
                },
                file_dep=[versions.VERSION_FILE],
                task_dep=["_iso_mkdir_root"],
            ),
            helper.SerializedData(
                task_name="product.txt",
                destination=constants.ISO_ROOT / "product.txt",
                data={
                    "NAME": config.PROJECT_NAME,
                    "VERSION": versions.VERSION,
                    "SHORT_VERSION": versions.SHORT_VERSION,
                    "GIT": constants.GIT_REF or "",
                    "DEVELOPMENT_RELEASE": "1"
                    if versions.VERSION_SUFFIX == "-dev"
                    else "0",
                    "BUILD_TIMESTAMP": dt.datetime.utcnow().strftime(
                        "%Y-%m-%dT%H:%M:%SZ"
                    ),
                    "BUILD_HOST": socket.gethostname(),
                },
                renderer=helper.Renderer.ENV,
                file_dep=[versions.VERSION_FILE],
                task_dep=["_iso_mkdir_root"],
                # False because we include the build timestamp.
                uptodate=[False],
            ),
        ),
        destination_directory=constants.ISO_ROOT,
        source_prefix=Path("scripts"),
        task_dep=["_iso_mkdir_root"],
    ),
)


def task_iso() -> types.TaskDict:
    """Build the MetalK8s image."""
    return {
        "actions": None,
        "task_dep": [
            "_iso_mkdir_root",
            "populate_iso",
            "_iso_build",
            "_iso_digest",
        ],
    }


def task__iso_mkdir_root() -> types.TaskDict:
    """Create the ISO root directory."""
    return helper.Mkdir(directory=constants.ISO_ROOT, task_dep=["_build_root"]).task


def task_populate_iso() -> types.TaskDict:
    """Populate the ISO_ROOT with required files."""
    return {
        "basename": "populate_iso",
        "actions": None,
        "doc": "Populate {} with required files.".format(
            utils.build_relpath(constants.ISO_ROOT)
        ),
        # Aggregate here the tasks that put files into ISO_ROOT.
        "task_dep": [
            "_iso_mkdir_root",
            "_iso_add_tree",
            "images",
            "salt_tree",
            "packaging",
            "documentation",
        ],
    }


def task__iso_add_tree() -> Iterator[types.TaskDict]:
    """Deploy an ISO sub-tree"""
    for file_tree in FILE_TREES:
        yield from file_tree.execution_plan


@doit.create_after(executed="populate_iso")  # type: ignore
def task__iso_build() -> types.TaskDict:
    """Create the ISO from the files in ISO_ROOT."""

    def on_failure() -> None:
        utils.unlink_if_exist(ISO_FILE)

    cmd: List[Union[str, Path]] = [
        config.ExtCommand.MKISOFS.value,
        "-output",
        ISO_FILE,
        "-quiet",
        "-rock",
        "-joliet",
        "-joliet-long",
        "-full-iso9660-filenames",
        "-volid",
        "{} {}".format(config.PROJECT_NAME, versions.VERSION),
        "--iso-level",
        "3",
        "-gid",
        "0",
        "-uid",
        "0",
        "-input-charset",
        "utf-8",
        "-output-charset",
        "utf-8",
        constants.ISO_ROOT,
    ]
    doc = "Create the ISO from the files in {}.".format(
        utils.build_relpath(constants.ISO_ROOT)
    )
    # Every file used for the ISO is a dependency.
    depends = list(coreutils.ls_files_rec(constants.ISO_ROOT))
    depends.append(versions.VERSION_FILE)
    return {
        "title": utils.title_with_target1("MKISOFS"),
        "doc": doc,
        "actions": [action.CmdActionOnFailure(cmd, shell=False, on_failure=on_failure)],
        "targets": [ISO_FILE],
        "file_dep": depends,
        "task_dep": ["check_for:mkisofs", "_build_root", "_iso_mkdir_root"],
        "clean": True,
    }


def task__iso_implantisomd5() -> types.TaskDict:
    """Implant data segments checksum into the ISO."""

    def on_failure() -> None:
        utils.unlink_if_exist(ISO_FILE)

    cmd: List[Union[str, Path]] = [
        config.ExtCommand.IMPLANTISOMD5.value,
        ISO_FILE,
    ]
    title = lambda _: "{cmd: <{width}} {path}".format(
        cmd="IMPLANTISOMD5",
        width=constants.CMD_WIDTH,
        path=utils.build_relpath(Path(ISO_FILE)),
    )
    doc = "Implant MD5 in ISO {}.".format(
        utils.build_relpath(ISO_FILE),
    )
    return {
        "title": title,
        "doc": doc,
        "file_dep": [ISO_FILE],
        "task_dep": ["check_for:implantisomd5", "_iso_build"],
        "actions": [action.CmdActionOnFailure(cmd, shell=False, on_failure=on_failure)],
    }


def task__iso_digest() -> types.TaskDict:
    """Compute the SHA256 digest of the ISO."""
    return helper.Sha256Sum(
        input_files=[ISO_FILE],
        output_file=config.BUILD_ROOT / "SHA256SUM",
        task_dep=["_iso_build", "_iso_implantisomd5"],
    ).task


__all__ = utils.export_only_tasks(__name__)
