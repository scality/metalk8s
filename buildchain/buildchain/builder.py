# coding: utf-8

"""Tasks to create build containers."""


from pathlib import Path
from typing import Any, Iterator, Tuple

from buildchain import config
from buildchain import constants
from buildchain import targets
from buildchain import types
from buildchain import utils
from buildchain import versions


def task__build_builder() -> Iterator[types.TaskDict]:
    """Build the builder containers."""
    for builder in _BUILDERS:
        yield builder.task


def _builder_image(
    name: str, dockerfile: Path, **kwargs: Any
) -> targets.LocalImage:
    """Create a builder image.

    Arguments:
        name:       builder name
        dockerfile: path to the Dockerfile

    Keyword Arguments:
        They are passed to `LocalImage` init method.
    """
    img_name = '{}-{}-builder'.format(config.PROJECT_NAME.lower(), name)
    return targets.LocalImage(
        name=img_name,
        version='latest',
        dockerfile=dockerfile,
        destination=config.BUILD_ROOT,
        save_on_disk=False,
        task_dep=['_builder_root'],
        **kwargs
    )


RPM_BUILDER : targets.LocalImage = _builder_image(
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

DEB_BUILDER : targets.LocalImage = _builder_image(
    name='deb',
    dockerfile=constants.ROOT/'packages/debian/Dockerfile',
)

DOC_BUILDER : targets.LocalImage = _builder_image(
    name='doc',
    dockerfile=constants.ROOT/'docs/Dockerfile',
    build_context=constants.ROOT,
    file_dep=[
        constants.ROOT/'tox.ini', constants.ROOT/'docs/requirements.txt'
    ]
)


_BUILDERS : Tuple[targets.LocalImage, ...] = (
    RPM_BUILDER, DEB_BUILDER, DOC_BUILDER,
)


__all__ = utils.export_only_tasks(__name__)
