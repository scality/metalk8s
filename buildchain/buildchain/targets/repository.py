# coding: utf-8


"""Provides software repository construction.

A repository is either built from an existing repository (e.g. epel) or build
from locally built packages (e.g. scality).

Note that, for now, we only generate CentOS 7 repository for x86_64
architecture.

Overview:

CASE 1: existing repository

┌────────────┐
│ build_repo │
└────────────┘

CASE 2: local repository

                                 ┌───────────┐
                           ╱────>│build:rpm1 │──────>│
                          ╱      └───────────┘       │
┌─────┐     ┌────────────┐       ┌───────────┐       │       ┌────────────────┐
│mkdir│────>│ build RPMs │──────>│build:rpm2 │──────>│──────>│build repository│
└─────┘     └────────────┘       └───────────┘       │       └────────────────┘
                          ╲      ┌───────────┐       │
                           ╲────>│build:rpm3 │──────>│
                                 └───────────┘
"""


import operator
from pathlib import Path
from typing import Any, List, Optional, Sequence

import doit  # type: ignore

from buildchain import config
from buildchain import coreutils
from buildchain import constants
from buildchain import types
from buildchain import utils

from . import base
from . import image
from . import package
from . import directory


MKDIR_ROOT_TASK_NAME = 'mkdir_repo_root'
MKDIR_ARCH_TASK_NAME = 'mkdir_repo_arch'


class Repository(base.Target, base.CompositeTarget):
    """A software repository for CentOS 7 x86_64."""

    SUFFIX = 'el7'
    ARCH   = 'x86_64'

    def __init__(
        self,
        basename: str,
        name: str,
        builder: image.ContainerImage,
        packages: Optional[Sequence[package.Package]]=None,
        **kwargs: Any
    ):
        """Initialize the repository.

        Arguments:
            basename: basename for the sub-tasks
            name:     repository name
            packages: list of locally built packages
            builder:  docker image used to build the package

        Keyword Arguments:
            They are passed to `Target` init method.
        """
        self._name = name
        self._builder = builder
        self._packages = packages or []
        super().__init__(
            basename='{base}:{name}'.format(base=basename, name=self.name),
            **kwargs
        )

    name     = property(operator.attrgetter('_name'))
    builder  = property(operator.attrgetter('_builder'))
    packages = property(operator.attrgetter('_packages'))

    @property
    def fullname(self) -> str:
        """Repository full name."""
        return '{project}-{repo}-{suffix}'.format(
            project=config.PROJECT_NAME.lower(),
            repo=self.name, suffix=self.SUFFIX
        )

    @property
    def rootdir(self) -> Path:
        """Repository root directory."""
        return constants.REPO_ROOT/self.fullname

    @property
    def repodata(self) -> Path:
        """Repository metadata directory."""
        return self.rootdir/'repodata'

    @property
    def execution_plan(self) -> List[types.TaskDict]:
        tasks = [self.build_repo()]
        if self._packages:
            tasks.extend(self.build_rpms())
        return tasks

    def build_repo(self) -> types.TaskDict:
        """Build the repository."""
        def clean() -> None:
            """Delete the repository metadata directory and its contents."""
            coreutils.rm_rf(self.repodata)

        mkdir = directory.Mkdir(directory=self.repodata).task
        actions = mkdir['actions']
        actions.append(self._buildrepo_cmd())
        targets = [self.repodata/'repomd.xml']
        targets.extend(mkdir['targets'])

        task = self.basic_task
        task.update({
            'name': 'build_repodata',
            'actions': actions,
            'doc': 'Build the {} repository metadata.'.format(self.name),
            'title': lambda task: utils.title_with_target1('BUILD REPO', task),
            'targets': targets,
            'uptodate': [doit.tools.run_once],
            'clean': [clean],
            # Prevent Docker from polluting our output.
            'verbosity': 0,
        })
        if self.packages:
            task['task_dep'].append('{base}:{name}'.format(
                base=self.basename, name=MKDIR_ROOT_TASK_NAME
            ))
            task['file_dep'].extend([
                self._get_rpm_path(pkg) for pkg in self.packages
            ])
        return task

    def build_rpms(self) -> List[types.TaskDict]:
        """Build the RPMs from SRPMs."""
        tasks = [self._mkdir_repo_root(), self._mkdir_repo_arch()]
        for pkg in self.packages:
            task = self.basic_task
            task.update({
                'name': 'build_rpm:{}'.format(pkg.name),
                'actions': [self._buildrpm_cmd(pkg)],
                'doc': 'Build {pkg} RPM for the {repo} repository.'.format(
                    pkg=pkg.name, repo=self.name
                ),
                'title': lambda task: utils.title_with_target1(
                    'BUILD RPM', task
                ),
                'targets': [self._get_rpm_path(pkg)],
                # Prevent Docker from polluting our output.
                'verbosity': 0,
            })
            task['file_dep'].extend([pkg.srpm, self.builder.destination])
            task['task_dep'].append('{base}:{name}'.format(
                base=self.basename, name=MKDIR_ARCH_TASK_NAME,
            ))
            tasks.append(task)
        return tasks

    def _mkdir_repo_root(self) -> types.TaskDict:
        """Create the root directory for the repository."""
        task = self.basic_task
        mkdir = directory.Mkdir(directory=self.rootdir).task
        task.update({
            'name': MKDIR_ROOT_TASK_NAME,
            'doc': 'Create root directory for the {} repository.'.format(
                self.name
            ),
            'title': mkdir['title'],
            'actions': mkdir['actions'],
            'uptodate': [doit.tools.run_once],
            'targets': mkdir['targets'],
        })
        return task

    def _mkdir_repo_arch(self) -> types.TaskDict:
        """Create the CPU architecture directory for the repository."""
        task = self.basic_task
        mkdir = directory.Mkdir(directory=self.rootdir/self.ARCH).task
        task.update({
            'name': MKDIR_ARCH_TASK_NAME,
            'doc': 'Create arch directory for the {} repository.'.format(
                self.name
            ),
            'title': mkdir['title'],
            'actions': mkdir['actions'],
            'uptodate': [doit.tools.run_once],
            'targets': mkdir['targets'],
        })
        task['task_dep'].append('{base}:{name}'.format(
            base=self.basename, name=MKDIR_ROOT_TASK_NAME
        ))
        return task

    def _get_rpm_path(self, pkg: package.Package) -> Path:
        """Return the path of the RPM of a given package."""
        filename = pkg.srpm.name.replace(
            '.src.rpm', '.{}.rpm'.format(self.ARCH)
        )
        return self.rootdir/self.ARCH/filename

    def _buildrpm_cmd(self, pkg: package.Package) -> List[str]:
        """Return the command to run `buildsrpm` inside a container."""
        rpm = self._get_rpm_path(pkg)
        extra_env = {
            'RPMS': '{arch}/{rpm}'.format(arch=self.ARCH, rpm=rpm.name),
            'SRPM': pkg.srpm.name,
        }
        cmd = list(constants.BUILDER_BASIC_CMD)
        for var, value in extra_env.items():
            cmd.extend(['--env', '{}={}'.format(var, value)])
        for mount_string in self._get_buildrpm_mounts(pkg.srpm, rpm.parent):
            cmd.extend(['--mount', mount_string])
        # Note: because we use `yum-builddep`, this one can't be `--read-only`.
        cmd.extend([
            self.builder.tag,
            '/entrypoint.sh', 'buildrpm'
        ])
        return cmd

    @staticmethod
    def _get_buildrpm_mounts(srpm_path: Path, rpm_dir: Path) -> List[str]:
        """Return the list of container mounts required by `buildrpm`."""
        # TMPFS mounts.
        mounts = [
            'type=tmpfs,destination=/home/build',
            'type=tmpfs,destination=/var/tmp',
        ]
        # SRPM directory.
        mounts.append(constants.BIND_RO_MOUNT_FMT.format(
            src=srpm_path,
            dst='/rpmbuild/SRPMS/{}'.format(srpm_path.name),
        ))
        # RPM directory.
        mounts.append('type=bind,source={src},destination={dst}'.format(
            src=rpm_dir, dst='/rpmbuild/RPMS',
        ))
        mounts.append(constants.BUILDER_RPMLINTRC_MOUNT)
        return mounts

    def _buildrepo_cmd(self) -> List[str]:
        """Return the command to run `buildrepo` inside a container."""
        cmd = list(constants.BUILDER_BASIC_CMD)
        extra_mounts = [
            'type=bind,source={},destination=/repository,ro'.format(
                self.rootdir
            ),
            'type=bind,source={},destination=/repository/repodata'.format(
                self.repodata
            ),
        ]
        for mount_string in extra_mounts:
            cmd.extend(['--mount', mount_string])
        cmd.extend([
            '--read-only',
            self.builder.tag,
            '/entrypoint.sh', 'buildrepo'
        ])
        return cmd
