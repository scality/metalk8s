# coding: utf-8


"""Useful global constants, used hither and yon."""


from pathlib import Path

from buildchain import ROOT  # Re-export ROOT through this module.
from buildchain import config


# Max length of a "command".
# (used in task display, for a nice aligned output).
CMD_WIDTH : int = 12

# URLs of the main container repositories.
GOOGLE_REGISTRY : str = 'k8s.gcr.io'
DOCKER_REGISTRY : str = 'docker.io/library'

# Paths {{{

# Root of the generated ISO.
ISO_ROOT : Path = config.BUILD_ROOT/'root'

# }}}
# Versions {{{

K8S_VERSION  : str = '1.11.7'
SALT_VERSION : str = '2018.3.3'


def load_version_information() -> None:
    """Load version information from `VERSION`."""
    to_update = {
        'VERSION_MAJOR', 'VERSION_MINOR', 'VERSION_PATCH', 'VERSION_SUFFIX'
    }
    with VERSION_FILE.open('r', encoding='utf-8') as fp:
        for line in fp:
            name, _, value = line.strip().partition('=')
            # Don't overwrite random variables by trusting an external file.
            if name in to_update:
                globals()[name.strip()] = value.strip()


VERSION_FILE : Path= ROOT/'VERSION'

# Metalk8s version.
# (Those declarations are not mandatory, but they help pylint and mypy).
VERSION_MAJOR  : str
VERSION_MINOR  : str
VERSION_PATCH  : str
VERSION_SUFFIX : str

load_version_information()

SHORT_VERSION : str = '{}.{}'.format(VERSION_MAJOR, VERSION_MINOR)
VERSION : str = '{}.{}{}'.format(SHORT_VERSION, VERSION_PATCH, VERSION_SUFFIX)

# }}}
