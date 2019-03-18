# coding: utf-8


"""Build configuration parameters.

Those can be edited by the user to customize/configure the build system.
"""


from pathlib import Path

from buildchain import ROOT


# Project name.
PROJECT_NAME : str = 'MetalK8s'

# Path to the root of the build directory.
BUILD_ROOT : Path = ROOT/'_build'
