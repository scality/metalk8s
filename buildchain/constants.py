# coding: utf-8


"""Useful global constants, used hither and yon."""


from pathlib import Path

# pylint:disable=unused-import
from buildchain import ROOT  # Re-export ROOT through this module.
from buildchain import config


# Max length of a "command".
# (used in task display, for a nice aligned output).
CMD_WIDTH : int = 12

# Paths {{{

# Root of the generated ISO.
ISO_ROOT : Path = config.BUILD_ROOT/'root'

# }}}
