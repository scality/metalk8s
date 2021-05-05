# coding: utf-8

"""Tasks to create build containers."""


from pathlib import Path
from typing import Any, Iterator, Tuple

from buildchain import config
from buildchain import constants
from buildchain import types
from buildchain import utils
from buildchain import versions
from buildchain.targets.local_image import LocalImage  # Avoid circular import…


def task__build_builder() -> Iterator[types.TaskDict]:
    """Build the builder containers."""
    for builder in BUILDERS:
        yield builder.task


def _builder_image(
    name: str, dockerfile: Path, **kwargs: Any
) -> LocalImage:
    """Create a builder image.

    Arguments:
        name:       builder name
        dockerfile: path to the Dockerfile

    Keyword Arguments:
        They are passed to `LocalImage` init method.
    """
    img_name = '{}-{}-builder'.format(config.PROJECT_NAME.lower(), name)
    kwargs.setdefault('task_dep', []).append('_build_root')

    return LocalImage(
        name=img_name,
        version='latest',
        dockerfile=dockerfile,
        destination=config.BUILD_ROOT,
        save_on_disk=False,
        **kwargs
    )


RPM_BUILDER : LocalImage = _builder_image(
    name='rpm',
    dockerfile=constants.ROOT/'packages/redhat/Dockerfile',
    file_dep=[
        constants.ROOT/'packages/redhat/yum_repositories/kubernetes.repo',
        constants.ROOT/'packages/redhat/yum_repositories/saltstack.repo'
    ],
    build_args={
        # Used to template the SaltStack repository definition
        'SALT_VERSION': versions.SALT_VERSION,
    },
)

DEB_BUILDER : LocalImage = _builder_image(
    name='deb',
    dockerfile=constants.ROOT/'packages/debian/Dockerfile',
)

DOC_BUILDER : LocalImage = _builder_image(
    name='doc',
    dockerfile=constants.ROOT/'docs/Dockerfile',
    build_context=constants.ROOT,
    file_dep=[
        constants.ROOT/'tox.ini', constants.ROOT/'docs/requirements.txt'
    ]
)

GO_BUILDER : LocalImage = _builder_image(
    name='go',
    dockerfile=constants.STORAGE_OPERATOR_ROOT/'Dockerfile',
    file_dep=[
        constants.STORAGE_OPERATOR_ROOT/'go.mod',
        constants.STORAGE_OPERATOR_ROOT/'go.sum',
    ]
)

UI_BUILDER : LocalImage = _builder_image(
    name='ui',
    dockerfile=constants.ROOT/'ui'/'Dockerfile',
    build_args={'NODE_IMAGE_VERSION': versions.NODEJS_IMAGE_VERSION},
    file_dep=[
        constants.ROOT/'ui'/'package.json',
        constants.ROOT/'ui'/'package-lock.json',
        constants.ROOT/'ui'/'entrypoint.sh',
    ]
)


BUILDERS : Tuple[LocalImage, ...] = (
    RPM_BUILDER,
    DEB_BUILDER,
    DOC_BUILDER,
    GO_BUILDER,
    UI_BUILDER,
)


__all__ = utils.export_only_tasks(__name__)
