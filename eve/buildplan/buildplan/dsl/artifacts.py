from collections import Mapping
import pathlib

from buildplan import core
from buildplan import shell
from buildplan.dsl import base
from buildplan.dsl import remote


ARTIFACTS = pathlib.Path("artifacts")
ARTIFACTS_URL = pathlib.Path("%(prop:artifacts_private_url)s")


class CopyArtifacts(shell.Shell):
    def __init__(self, sources, destination=None, **kwargs):
        if destination is not None:
            dest_dir = ARTIFACTS / destination
        else:
            dest_dir = ARTIFACTS

        self.dest_dir = dest_dir
        self.sources = sources
        self._kwargs = kwargs

        name = "Copy artifacts"
        if destination is not None:
            name += " for '{}'".format(destination)

        super(CopyArtifacts, self).__init__(
            name,
            command=self.__command('cp -r "$artifact" {s.dest_dir}'),
            **kwargs,
        )

    def __command(self, copy_cmd):
        return shell._seq(
            "mkdir -p {s.dest_dir}",
            shell._for(self.sources, copy_cmd, var="artifact"),
        ).format(s=self)

    def as_remote(self, ssh_config, host):
        self._command = self.__command(
            remote._scp(
                ssh_config,
                source="{host}:$artifact".format(host=host),
                dest=self.dest_dir,
                recursive=True,
            )
        )
        return self


def copy_artifacts(sources, destination=None, **kwargs):
    if isinstance(sources, Mapping):
        yield from [
            CopyArtifacts(sources=source_list, destination=dest)
            for dest, source_list in sources.items()
        ]
    else:
        yield CopyArtifacts(
            sources=sources, destination=destination, **kwargs,
        )


class RetrieveArtifacts(shell.Shell):
    def __init__(self, name, sources, destination=".", **kwargs):
        self.sources = sources
        self.destination = pathlib.Path(destination)

        super(RetrieveArtifacts, self).__init__(
            name,
            command=shell._for(
                sources,
                'curl --retry 10 -O "{}"'.format(ARTIFACTS_URL / "$file"),
                var="file",
            ),
            workdir=base.BUILD_DIR / self.destination,
            **kwargs,
        )

    def as_remote(self, ssh_config, host):
        """Retrieve artifacts on the worker before copying to the remote."""
        self._command = shell._seq(
            self._command,
            remote._ssh(
                ssh_config, host, "mkdir -p {}".format(self.destination)
            ),
            shell._for(
                self.sources,
                remote._scp(ssh_config, "$file", "{host}:{dest}",).format(
                    host=host, dest=self.destination / "$file",
                ),
                var="file",
            ),
        )

        # Reset workdir since remote commands rely on the SSH config file path
        # provided from the default workdir "build/"
        self.workdir = None

        return self


class WithArtifacts(base.StageDecorator):
    """Automatically upload artifacts after a stage.

    Steps within the stage should copy artifacts into a well-known directory
    using the `CopyArtifacts` step (wrapper of `ShellCommand`) or the
    `copy_artifacts` helper (which can handle a mapping of destination to list
    of sources).
    """

    def __init__(self, urls=None):
        self.urls = urls

    def mutate(self, stage):
        stage.steps.append(
            core.Upload(
                "Upload artifacts",
                source=ARTIFACTS,
                urls=self.urls,
                always_run=True,
            )
        )
