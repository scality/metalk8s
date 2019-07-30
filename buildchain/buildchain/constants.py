# coding: utf-8


"""Useful global constants, used hither and yon."""


from pathlib import Path
import subprocess
from typing import Optional

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
# Root for the images on the ISO.
ISO_IMAGE_ROOT : Path = ISO_ROOT/'images'
# Root for the packages that we build ourselves.
PKG_ROOT : Path = config.BUILD_ROOT/'packages'
# Root of the Vagrant environment folder.
VAGRANT_ROOT : Path = ROOT/'.vagrant'
# Path to the static-container-registry module.
STATIC_CONTAINER_REGISTRY : Path = Path(
    ROOT, 'buildchain/static-container-registry'
)

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
