# coding: utf-8


"""Module gathering custom tasks producing generic and reusable targets."""


from buildchain.targets.base import (
    Target, AtomicTarget, CompositeTarget, FileTarget
)
from buildchain.targets.directory import Mkdir
