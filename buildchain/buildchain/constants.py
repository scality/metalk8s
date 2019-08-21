# coding: utf-8


"""Useful global constants, used hither and yon."""


from pathlib import Path
import subprocess
from typing import Optional, FrozenSet

from buildchain import ROOT  # Re-export ROOT through this module.
from buildchain import config


# Max length of a "command".
# (used in task display, for a nice aligned output).
CMD_WIDTH : int = 12

# URLs of the main container repositories.
CALICO_REPOSITORY     : str = 'quay.io/calico'
COREOS_REPOSITORY     : str = 'quay.io/coreos'
DOCKER_REPOSITORY     : str = 'docker.io/library'
GOOGLE_REPOSITORY     : str = 'k8s.gcr.io'
GRAFANA_REPOSITORY    : str = 'docker.io/grafana'
INGRESS_REPOSITORY    : str = 'quay.io/kubernetes-ingress-controller'
PROMETHEUS_REPOSITORY : str = 'quay.io/prometheus'

# Paths {{{

# Root of the generated ISO.
ISO_ROOT : Path = config.BUILD_ROOT/'root'
# Root of the repositories on the ISO.
REPO_ROOT : Path = ISO_ROOT/'packages'
# Root of the RedHat repositories on the ISO.
REPO_RPM_ROOT : Path = REPO_ROOT/'redhat'
# Root of the Debian repositories on the ISO.
REPO_DEB_ROOT : Path = REPO_ROOT/'debian'
# Root for the images on the ISO.
ISO_IMAGE_ROOT : Path = ISO_ROOT/'images'
# Root for the packages that we build ourselves.
PKG_ROOT : Path = config.BUILD_ROOT/'packages'
# Root for the RPM packages that we build ourselves.
PKG_RPM_ROOT : Path = PKG_ROOT/'redhat'
# Root for the Debian packages that we build ourselves.
PKG_DEB_ROOT : Path = PKG_ROOT/'debian'
# Root of the Vagrant environment folder.
VAGRANT_ROOT : Path = ROOT/'.vagrant'
# Path to the static-container-registry module.
STATIC_CONTAINER_REGISTRY : Path = Path(
    ROOT, 'buildchain/static-container-registry'
)
# Path to the storage-operator source directory.
STORAGE_OPERATOR_ROOT : Path = ROOT/'storage-operator'

# }}}
# Vagrant parameters {{{

VAGRANT_SSH_KEY_PAIR : Path = VAGRANT_ROOT/'preshared_key_for_k8s_nodes'

# }}}
# Git project information {{{


def git_ref() -> Optional[str]:
    """Load version information from Git."""

    try:
        ref : bytes = subprocess.check_output([
            config.ExtCommand.GIT.value, 'describe', '--always', '--long',
            '--tags', '--dirty',
        ])

        return ref.decode('utf-8').rstrip()
    except subprocess.CalledProcessError:
        return None


GIT_REF = git_ref()

# }}}

# Only keep directories and top-level Go source files.
STORAGE_OPERATOR_FMT_ARGS : FrozenSet[str] = frozenset([
    path.name for path in STORAGE_OPERATOR_ROOT.glob('*')
    if path.is_dir() or path.suffix == '.go'
])
STORAGE_OPERATOR_SOURCES : FrozenSet[Path] = frozenset([
    filepath for filepath in STORAGE_OPERATOR_ROOT.rglob('*.go')
])
