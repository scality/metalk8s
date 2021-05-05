# coding: utf-8


"""Provides container image construction.

The images are built from a local Dockerfile.
Then, they are tagged and optionally saved on the disk (compressed).

If the image is not saved in the build tree, a dummy empty file is created to
keep track of it.

All of these actions are done by a single task.
"""


import operator
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from buildchain import config
from buildchain import constants
from buildchain import coreutils
from buildchain import docker_command
from buildchain import types

from . import base
from . import image


class LocalImage(image.ContainerImage):
    """A locally built container image."""
    def __init__(
        self,
        name: str,
        version: str,
        dockerfile: Path,
        destination: Path,
        save_on_disk: bool,
        build_context: Optional[Path]=None,
        build_args: Optional[Dict[str, Any]]=None,
        **kwargs: Any
    ):
        """Initialize a local container image.

        Arguments:
            name:          image name
            version:       image version
            dockerfile:    path to the Dockerfile
            destination:   where to save the result
            save_on_disk:  save the image on disk?
            build_context: path to the build context
                           (default to the directory containing the Dockerfile)
            build_args:    build arguments

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        self._dockerfile = dockerfile
        self._save = save_on_disk
        self._build_context = build_context or self.dockerfile.parent
        self._build_args = build_args or {}
        kwargs.setdefault('file_dep', []).append(self.dockerfile)
        kwargs.setdefault('task_dep', []).append('check_for:skopeo')
        kwargs.setdefault('calc_dep', []).append(
            f'_image_calc_build_deps:{self.dockerfile}'
        )
        super().__init__(
            name=name, version=version, destination=destination, **kwargs
        )

    dockerfile    = property(operator.attrgetter('_dockerfile'))
    save_on_disk  = property(operator.attrgetter('_save'))
    build_context = property(operator.attrgetter('_build_context'))
    build_args    = property(operator.attrgetter('_build_args'))
    dep_re = re.compile(
        r'^\s*(COPY|ADD)( --[^ ]+)* (?P<src>[^ ]+) (?P<dst>[^ ]+)\s*$'
    )

    def load_deps_from_dockerfile(self) -> Dict[str, Any]:
        """Compute file dependencies from Dockerfile."""
        dep_keywords = ('COPY', 'ADD')

        with self.dockerfile.open('r', encoding='utf8') as dockerfile:
            docker_lines = dockerfile.readlines()

        dep_matches = [
            self.dep_re.match(line.strip())
            for line in docker_lines
            if line.lstrip().startswith(dep_keywords)
        ]
        deps = []
        for match in dep_matches:
            if match is None:
                continue
            deps.extend(self._expand_dep(self.build_context / match.group('src')))

        # NOTE: we **must** convert to string here, otherwise the serialization
        # fails and the build exits with return code 3.
        return {"file_dep": list(map(str, deps))}

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update({
            'title': lambda _: self.show('IMG BUILD'),
            'doc': 'Build {} container image.'.format(self.name),
            'actions': self._build_actions(),
            'uptodate': [(docker_command.docker_image_exists, [self.tag], {})],
        })
        if self.save_on_disk:
            task.update({
                'targets': [self.dirname/'manifest.json'],
                'clean': [self.clean],
            })
        return task

    @property
    def calc_deps_task(self) -> types.TaskDict:
        """A task used to compute dependencies from the Dockerfile."""
        task = base.Target(
            task_name=str(self.dockerfile),
            file_dep=[self.dockerfile],
            task_dep=self.task_dep,
        ).basic_task
        task["title"] = lambda _: "{cmd: <{width}} {path}".format(
            cmd="CALC DEPS",
            width=constants.CMD_WIDTH,
            path=self.dockerfile.relative_to(constants.ROOT),
        )
        task["actions"] = [self.load_deps_from_dockerfile]
        return task

    def _build_actions(self) -> List[types.Action]:
        """Build a container image locally."""
        actions = self._do_build()
        if self.save_on_disk:
            actions.extend(self._do_save())
        return actions

    def _do_build(self) -> List[types.Action]:
        """Return the actions used to build the image."""
        return [(docker_command.docker_build, [self], {})]

    def _do_save(self) -> List[types.Action]:
        """Return the actions used to save the image."""
        # If a destination is defined, let's save the image there.
        cmd = [
            config.ExtCommand.SKOPEO.value, '--override-os', 'linux',
            '--insecure-policy', 'copy', '--format', 'v2s2',
            '--dest-compress',
        ]
        docker_host = os.getenv('DOCKER_HOST')
        if docker_host is not None:
            cmd.extend([
                '--src-daemon-host', 'http://{}'.format(docker_host)
            ])
        cmd.append('docker-daemon:{}'.format(self.tag))
        cmd.append('dir:{}'.format(str(self.dirname)))
        return [self.mkdirs, cmd]

    @staticmethod
    def _expand_dep(dep: Path) -> List[Path]:
        """Expand a Dockerfile dependency path to regular files."""
        # Simple file
        if dep.is_file():
            return [dep]
        # Directory or `.`
        if dep.is_dir():
            return list(coreutils.ls_files_rec(dep))
        # Globs - `*` or specific e.g. `*.py`, `*.repo`
        return [
            sub_path
            for sub_path in dep.parent.glob(dep.name)
            if sub_path.is_file()
        ]
