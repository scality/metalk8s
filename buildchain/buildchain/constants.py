# coding: utf-8


"""Useful global constants, used hither and yon."""


from pathlib import Path
import subprocess
from typing import List, Optional, FrozenSet

from buildchain import ROOT  # Re-export ROOT through this module.
from buildchain import config


# Max length of a "command".
# (used in task display, for a nice aligned output).
CMD_WIDTH: int = 14

# URLs of the main container repositories.
BITNAMI_REPOSITORY: str = "docker.io/bitnami"
CALICO_REPOSITORY: str = "docker.io/calico"
COREDNS_REPOSITORY: str = "k8s.gcr.io/coredns"
DEX_REPOSITORY: str = "ghcr.io/dexidp"
DOCKER_REPOSITORY: str = "docker.io/library"
GOOGLE_REPOSITORY: str = "k8s.gcr.io"
GRAFANA_REPOSITORY: str = "docker.io/grafana"
INGRESS_REPOSITORY: str = "k8s.gcr.io/ingress-nginx"
KIWIGRID_REPOSITORY: str = "quay.io/kiwigrid"
KUBE_STATE_METRICS_REPOSITORY: str = "k8s.gcr.io/kube-state-metrics"
PROMETHEUS_ADAPTER_REPOSITORY: str = "docker.io/directxman12"
PROMETHEUS_OPERATOR_REPOSITORY: str = "quay.io/prometheus-operator"
PROMETHEUS_REPOSITORY: str = "quay.io/prometheus"

# Paths {{{

# Root of the generated ISO.
ISO_ROOT: Path = config.BUILD_ROOT / "root"
# Root of the repositories on the ISO.
REPO_ROOT: Path = ISO_ROOT / "packages"
# Root of the RedHat repositories on the ISO.
REPO_REDHAT_ROOT: Path = REPO_ROOT / "redhat"
# Root for the images on the ISO.
ISO_IMAGE_ROOT: Path = ISO_ROOT / "images"
# Root for the documentation on the ISO.
ISO_DOCS_ROOT: Path = ISO_ROOT / "documentation"
# Root for the documentation build.
DOCS_BUILD_ROOT: Path = config.BUILD_ROOT / "docs"
# Root for the packages that we build ourselves.
PKG_ROOT: Path = config.BUILD_ROOT / "packages"
# Root for the RedHat packages that we build ourselves.
PKG_REDHAT_ROOT: Path = PKG_ROOT / "redhat"
# Root of the Vagrant environment folder.
VAGRANT_ROOT: Path = ROOT / ".vagrant"
# Path to the static-container-registry module.
STATIC_CONTAINER_REGISTRY: Path = Path(ROOT, "buildchain/static-container-registry")
# Path to the storage-operator source directory.
STORAGE_OPERATOR_ROOT: Path = ROOT / "storage-operator"
# Path to the UI build root directory.
UI_BUILD_ROOT: Path = config.BUILD_ROOT / "ui"
# Path to the shell-ui build root directory.
SHELL_UI_BUILD_ROOT: Path = config.BUILD_ROOT / "shell-ui"

# Docker entrypoints.
REDHAT_ENTRYPOINT: Path = ROOT / "packages/redhat/common/entrypoint.sh"

# Path to UI static files.
UI_PUBLIC: Path = ROOT / "ui/public"
UI_BRANDING: Path = UI_PUBLIC / "brand"
UI_ASSETS: Path = UI_BRANDING / "assets"

# }}}
# Vagrant parameters {{{

VAGRANT_SSH_KEY_PAIR: Path = VAGRANT_ROOT / "preshared_key_for_k8s_nodes"

# }}}
# Git project information {{{


def git_ref() -> Optional[str]:
    """Load version information from Git."""

    try:
        ref: bytes = subprocess.check_output(
            [
                config.ExtCommand.GIT.value,
                "describe",
                "--always",
                "--long",
                "--tags",
                "--dirty",
            ]
        )

        return ref.decode("utf-8").rstrip()
    except subprocess.CalledProcessError:
        return None


GIT_REF = git_ref()

# }}}
# Skopeo default arguments {{{

SKOPEO_COPY_DEFAULT_ARGS: List[str] = [
    config.ExtCommand.SKOPEO.value,
    "--override-os",
    "linux",
    "--insecure-policy",
    "copy",
    "--format",
    "v2s2",
]

# }}}
# Alert tree definitions {{{
LIB_ALERT_TREE_ROOT = ROOT / "tools/lib-alert-tree"
ALERT_TREE_SOURCES: FrozenSet[Path] = frozenset(LIB_ALERT_TREE_ROOT.rglob("*.py"))

# }}}
# Only keep directories and top-level Go source files.
STORAGE_OPERATOR_FMT_ARGS: FrozenSet[str] = frozenset(
    [
        path.name
        for path in STORAGE_OPERATOR_ROOT.glob("*")
        if path.is_dir() or path.suffix == ".go"
    ]
)
STORAGE_OPERATOR_SOURCES: FrozenSet[Path] = frozenset(
    filepath for filepath in STORAGE_OPERATOR_ROOT.rglob("*.go")
)
GO_SOURCES: FrozenSet[Path] = frozenset(filepath for filepath in ROOT.rglob("*.go"))

OPERATOR_SDK_GENERATE_CMDS: List[List[str]] = [
    [config.ExtCommand.OPERATOR_SDK.value, "generate", "k8s"],
    [config.ExtCommand.OPERATOR_SDK.value, "generate", "crds", "--crd-version", "v1"],
]

# For mypy, see `--no-implicit-reexport` documentation.
__all__ = ["ROOT"]
