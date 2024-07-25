# coding: utf-8


"""Useful global constants, used hither and yon."""


from pathlib import Path
import subprocess
from typing import List, Optional, FrozenSet

from buildchain import ROOT  # Re-export ROOT through this module.
from buildchain import config, versions


# Max length of a "command".
# (used in task display, for a nice aligned output).
CMD_WIDTH: int = 14

# URLs of the main container repositories.
K8S_REPOSITORY: str = "registry.k8s.io"
CALICO_REPOSITORY: str = "docker.io/calico"
COREDNS_REPOSITORY: str = f"{K8S_REPOSITORY}/coredns"
DEX_REPOSITORY: str = "ghcr.io/dexidp"
DOCKER_REPOSITORY: str = "docker.io/library"
FLUENT_REPOSITORY: str = "cr.fluentbit.io/fluent"
GRAFANA_REPOSITORY: str = "docker.io/grafana"
INGRESS_REPOSITORY: str = f"{K8S_REPOSITORY}/ingress-nginx"
KIWIGRID_REPOSITORY: str = "quay.io/kiwigrid"
KUBE_STATE_METRICS_REPOSITORY: str = f"{K8S_REPOSITORY}/kube-state-metrics"
PROMETHEUS_ADAPTER_REPOSITORY: str = f"{K8S_REPOSITORY}/prometheus-adapter"
PROMETHEUS_OPERATOR_REPOSITORY: str = "quay.io/prometheus-operator"
PROMETHEUS_REPOSITORY: str = "quay.io/prometheus"
THANOS_REPOSITORY: str = "quay.io/thanos"
OPERATOR_FRAMEWORK_REPOSITORY: str = "quay.io/operator-framework"
OPERATORHUB_REPOSITORY: str = "quay.io/operatorhubio"
CERT_MANAGER_REPOSITORY: str = "quay.io/jetstack"

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
# Path to the MetalK8s operator source directory
METALK8S_OPERATOR_ROOT: Path = ROOT / "operator"
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

# Path to the chart files
CHART_ROOT: Path = ROOT / "charts"
CHART_RENDER_SCRIPT: Path = CHART_ROOT / "render.py"

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
METALK8S_OPERATOR_SOURCES: FrozenSet[Path] = frozenset(
    filepath for filepath in METALK8S_OPERATOR_ROOT.rglob("*.go")
)
STORAGE_OPERATOR_SOURCES: FrozenSet[Path] = frozenset(
    filepath for filepath in STORAGE_OPERATOR_ROOT.rglob("*.go")
)
GO_SOURCES: FrozenSet[Path] = frozenset(filepath for filepath in ROOT.rglob("*.go"))

STORAGE_OPERATOR_SDK_GENERATE_CMDS: List[List[str]] = [
    [config.ExtCommand.MAKE.value, "generate"],
    [config.ExtCommand.MAKE.value, "manifests"],
]
METALK8S_OPERATOR_SDK_GENERATE_CMDS: List[List[str]] = [
    [config.ExtCommand.MAKE.value, "generate"],
    [config.ExtCommand.MAKE.value, "manifests"],
    [config.ExtCommand.MAKE.value, "metalk8s"],
]

CHART_RENDER_CMD: str = f"tox -e chart-render -- --kube-version {versions.K8S_VERSION}"

# For mypy, see `--no-implicit-reexport` documentation.
__all__ = ["ROOT"]
