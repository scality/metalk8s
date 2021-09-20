# coding: utf-8

"""Tasks to build the MetalK8s documentation and add it to the ISO.

This module provides task to:
- build the doc as HTML
- build the doc as PDF
- add the generated PDF into the ISO

Overview;

               ┌──────────┐
           ───>│ doc:html │
┌───────┐╱     └──────────┘
│  doc  │
└───────┘╲     ┌──────────┐
           ───>│ doc:pdf  │
               └──────────┘

┌─────────┐
│ livedoc │
└─────────┘

┌───────────────┐    ┌───────┐    ┌────────┐
│ documentation │───>│ mkdir │───>│ deploy │
└───────────────┘    └───────┘    └────────┘
"""


from collections import namedtuple
from typing import Callable, Iterator
from pathlib import Path

import doit  # type: ignore

from buildchain import builder
from buildchain import config
from buildchain import coreutils
from buildchain import constants
from buildchain import docker_command
from buildchain import targets
from buildchain import types
from buildchain import utils


DocTarget = namedtuple("DocTarget", ("name", "command", "target"))
DOC_PDF_FILE: Path = constants.DOCS_BUILD_ROOT / "latex/{}.pdf".format(
    config.PROJECT_NAME
)


def task_documentation() -> types.TaskDict:
    """Generate documentations for the ISO."""
    return {
        "actions": None,
        "task_dep": ["_doc_mkdir_iso_root", "_doc_deploy"],
    }


def task__doc_mkdir_iso_root() -> types.TaskDict:
    """Create the documentation root directory on the ISO."""
    return targets.Mkdir(
        directory=constants.ISO_DOCS_ROOT, task_dep=["_iso_mkdir_root"]
    ).task


def task__doc_mkdir_build_root() -> types.TaskDict:
    """Create the documentation build root directory."""

    def clean_doctrees() -> None:
        coreutils.rm_rf(constants.DOCS_BUILD_ROOT / "doctrees")

    task = targets.Mkdir(
        directory=constants.DOCS_BUILD_ROOT, task_dep=["_build_root"]
    ).task
    task["clean"] = [clean_doctrees, doit.task.clean_targets]
    return task


def task__doc_deploy() -> types.TaskDict:
    """Deploy the documentation on the ISO."""
    source = DOC_PDF_FILE
    target = constants.ISO_DOCS_ROOT / "user-guide.pdf"
    return {
        "title": utils.title_with_target1("COPY"),
        "actions": [(coreutils.cp_file, (source, target))],
        "targets": [target],
        "task_dep": ["_doc_mkdir_iso_root"],
        "file_dep": [source],
        "clean": True,
    }


def task_doc() -> Iterator[types.TaskDict]:
    """Generate the documentation."""

    def clean(target: DocTarget) -> Callable[[], None]:
        """Delete the build sub-directory for the given target."""
        return lambda: coreutils.rm_rf(target.target.parent)

    doc_targets = (
        DocTarget(
            name="html",
            command="html",
            target=constants.DOCS_BUILD_ROOT / "html/index.html",
        ),
        DocTarget(name="pdf", command="latexpdf", target=DOC_PDF_FILE),
    )
    for target in doc_targets:
        doc_format = target.name.upper()
        run_config = docker_command.default_run_config(
            constants.ROOT / "docs/entrypoint.sh"
        )
        # The builder stores the tox env in /tmp, don't shadow it!
        run_config.pop("tmpfs", None)
        build_doc = docker_command.DockerRun(
            command=["/entrypoint.sh", target.command],
            builder=builder.DOC_BUILDER,
            run_config=run_config,
            mounts=[
                utils.bind_mount(
                    target=Path("/usr/src/metalk8s/docs/_build/"),
                    source=constants.DOCS_BUILD_ROOT,
                ),
                utils.bind_mount(
                    target=Path("/usr/src/metalk8s/"), source=constants.ROOT
                ),
            ],
        )
        yield {
            "name": target.name,
            "title": utils.title_with_target1("DOC {}".format(doc_format)),
            "doc": "Generate {} {} documentation".format(
                config.PROJECT_NAME, doc_format
            ),
            "actions": [build_doc],
            "targets": [target.target],
            "file_dep": list(utils.git_ls("docs")),
            "task_dep": [
                "_doc_mkdir_build_root",
                "_build_builder:{}".format(builder.DOC_BUILDER.name),
            ],
            "clean": [clean(target)],
        }


def task_livedoc() -> types.TaskDict:
    """Start documentation auto-build with live-reload."""
    return {
        "title": lambda _: "LIVEDOC",
        "doc": task_livedoc.__doc__,
        "actions": [doit.tools.LongRunning("tox -e docs -- livehtml")],
        "uptodate": [False],
        "task_dep": ["check_for:tox"],
    }


__all__ = utils.export_only_tasks(__name__)
