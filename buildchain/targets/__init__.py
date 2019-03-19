# coding: utf-8


"""Module gathering custom tasks producing generic and reusable targets."""


from buildchain.targets.base import (
    Target, AtomicTarget, CompositeTarget, FileTarget
)
from buildchain.targets.checksum import Sha256Sum
from buildchain.targets.directory import Mkdir
from buildchain.targets.remote_image import RemoteImage
from buildchain.targets.template import TemplateFile
