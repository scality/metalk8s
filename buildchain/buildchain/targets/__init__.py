# coding: utf-8


"""Module gathering custom tasks producing generic and reusable targets."""


from buildchain.targets.base import Target, AtomicTarget, CompositeTarget
from buildchain.targets.checksum import Sha256Sum
from buildchain.targets.directory import Mkdir
from buildchain.targets.file_tree import FileTree
from buildchain.targets.local_image import LocalImage, ExplicitContext
from buildchain.targets.operator_image import OperatorImage
from buildchain.targets.package import Package, RPMPackage, DEBPackage
from buildchain.targets.remote_image import (
    ImageSaveFormat, RemoteImage, SaveAsLayers, SaveAsTar
)
from buildchain.targets.repository import (
    Repository, RPMRepository, DEBRepository
)
from buildchain.targets.serialize import (
    Renderer, SerializedData, SaltState, YAMLDocument
)
from buildchain.targets.template import TemplateFile

# For mypy, see `--no-implicit-reexport` documentation.
__all__ = [
    'Target', 'AtomicTarget', 'CompositeTarget',
    'Sha256Sum',
    'Mkdir',
    'FileTree',
    'LocalImage', 'ExplicitContext',
    'OperatorImage',
    'Package', 'RPMPackage', 'DEBPackage',
    'ImageSaveFormat', 'RemoteImage', 'SaveAsLayers', 'SaveAsTar',
    'Repository', 'RPMRepository', 'DEBRepository',
    'Renderer', 'SerializedData', 'SaltState', 'YAMLDocument',
    'TemplateFile',
]
