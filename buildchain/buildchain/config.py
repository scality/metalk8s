# coding: utf-8


"""Build configuration parameters.

Those can be edited by the user to customize/configure the build system.
"""


import os
import shlex
import enum

from typing import Tuple
from pathlib import Path

from buildchain import ROOT


# /!\ All the global defined here must be documented in BUILDING.md /!\


# Project name.
PROJECT_NAME: str = os.getenv("PROJECT_NAME", "MetalK8s")

# Path to the root of the build directory.
BUILD_ROOT: Path = Path(os.getenv("BUILD_ROOT", "_build"))
if not BUILD_ROOT.is_absolute():
    BUILD_ROOT = ROOT / BUILD_ROOT
BUILD_ROOT = BUILD_ROOT.resolve()

# Vagrant configuration.
VAGRANT_PROVIDER: str = os.getenv("VAGRANT_PROVIDER", "virtualbox")
_DEFAULT_VAGRANT_UP_ARGS: str = " ".join(
    (
        "--provision",
        "--no-destroy-on-error",
        "--parallel",
        "--provider",
        VAGRANT_PROVIDER,
    )
)

VAGRANT_SNAPSHOT_NAME: str = "bootstrap.autosnapshot"

VAGRANT_UP_ARGS: Tuple[str, ...] = tuple(
    shlex.split(os.getenv("VAGRANT_UP_ARGS", _DEFAULT_VAGRANT_UP_ARGS))
)

# External commands {{{

# Name of the external commands (if in the PATH) or path to the binary.


class ExtCommand(enum.Enum):
    """External commands used by the build chain."""

    GIT = os.getenv("GIT_BIN", "git")
    GOFMT = os.getenv("GOFMT_BIN", "gofmt")
    HARDLINK = os.getenv("HARDLINK_BIN", "hardlink")
    HELM = os.getenv("HELM_BIN", "helm")
    IMPLANTISOMD5 = os.getenv("IMPLANTISOMD5_BIN", "implantisomd5")
    MAKE = os.getenv("MAKE_BIN", "make")
    MKISOFS = os.getenv("MKISOFS_BIN", "mkisofs")
    SKOPEO = os.getenv("SKOPEO_BIN", "skopeo")
    TOX = os.getenv("TOX_BIN", "tox")
    VAGRANT = os.getenv("VAGRANT_BIN", "vagrant")

    @property
    def command_name(self) -> str:
        """Return the name of the command."""
        return self.name.lower()


# }}}
