# coding: utf-8

"""Unit tests for `RemoteImage`."""

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

import pytest

from buildchain import docker_command
from buildchain.targets import remote_image
from buildchain.targets.remote_image import (
    RemoteImage,
    SaveAsLayers,
    SaveAsOCILayout,
    SaveAsTar,
)

DIGEST = "sha256:" + "0" * 64
LIST = "application/vnd.docker.distribution.manifest.list.v2+json"
MANIFEST = "application/vnd.docker.distribution.manifest.v2+json"


def make_image(digest: Optional[str] = DIGEST, **kwargs: Any) -> RemoteImage:
    """A `RemoteImage` with harmless defaults."""
    defaults: dict = {
        "repository": "registry.invalid/project",
        "name": "some-image",
        "version": "1.0.0",
        "destination": Path("/destination"),
    }
    defaults.update(kwargs)
    return RemoteImage(digest=digest, **defaults)


def digest_of(content: bytes) -> str:
    return f"sha256:{hashlib.sha256(content).hexdigest()}"


class Upstream:
    """A registry holding one image, answering skopeo commands."""

    def __init__(self, platforms: List[str], indexed: bool = True) -> None:
        self.blobs: Dict[str, bytes] = {}
        self.commands: List[List[str]] = []
        descriptors = []
        for platform in platforms:
            os_name, architecture = platform.split("/")
            config = self.add(json.dumps({"architecture": architecture}).encode())
            layer = self.add(f"layer for {platform}".encode())
            manifest = {
                "schemaVersion": 2,
                "mediaType": MANIFEST,
                "config": {"digest": config},
                "layers": [{"digest": layer}],
            }
            descriptors.append(
                {
                    "mediaType": MANIFEST,
                    "digest": self.add(json.dumps(manifest).encode()),
                    "platform": {"os": os_name, "architecture": architecture},
                }
            )
        if indexed:
            index = {"schemaVersion": 2, "mediaType": LIST, "manifests": descriptors}
            self.pinned = self.add(json.dumps(index).encode())
        else:
            self.pinned = descriptors[0]["digest"]
        self.images = dict(zip(platforms, (d["digest"] for d in descriptors)))

    def add(self, content: bytes) -> str:
        digest = digest_of(content)
        self.blobs[digest] = content
        return digest

    def run(self, command: List[str], **_: Any) -> subprocess.CompletedProcess:
        self.commands.append(command)
        if "inspect" in command:
            digest = command[-1].rsplit("@", 1)[1]
            return subprocess.CompletedProcess(command, 0, self.blobs[digest], b"")
        digest = command[-2].rsplit("@", 1)[1]
        staging = Path(command[-1].removeprefix("dir:"))
        manifest = self.blobs[digest]
        (staging / "manifest.json").write_bytes(manifest)
        content = json.loads(manifest)
        for descriptor in [content["config"], *content["layers"]]:
            blob = descriptor["digest"]
            (staging / blob.removeprefix("sha256:")).write_bytes(self.blobs[blob])
        (staging / "version").write_text("Directory Transport Version: 1.1\n")
        return subprocess.CompletedProcess(command, 0, b"", b"")


@pytest.fixture(name="upstream")
def fixture_upstream(monkeypatch: pytest.MonkeyPatch) -> Upstream:
    registry = Upstream(["linux/arm64", "linux/amd64", "windows/amd64"])
    monkeypatch.setattr(remote_image.subprocess, "run", registry.run)
    return registry


def write_layout(tmp_path: Path, upstream: Upstream) -> RemoteImage:
    image = make_image(
        digest=upstream.pinned, destination=tmp_path, save_as=[SaveAsOCILayout()]
    )
    for action in image.task["actions"]:
        if callable(action):
            action()
        else:
            action[0](*action[1], **action[2])
    return image


def blob(image: RemoteImage, digest: str) -> Path:
    return image.layout_dirname / "blobs" / "sha256" / digest.removeprefix("sha256:")


class TestPin:
    @pytest.mark.parametrize("digest", [None, "", "1.0.0", "sha256:abc"])
    def test_an_image_without_a_digest_is_rejected(self, digest: Optional[str]) -> None:
        with pytest.raises(ValueError, match="pin the digest"):
            make_image(digest=digest)

    def test_layers_are_copied_by_digest(self) -> None:
        image = make_image(save_as=[SaveAsLayers()])
        (copy,) = (a for a in image.task["actions"] if isinstance(a, list))
        assert copy[-2:] == [
            f"docker://registry.invalid/project/some-image@{DIGEST}",
            f"dir:{image.dirname}",
        ]

    def test_tarballs_are_pulled_by_digest(self) -> None:
        image = make_image(save_as=[SaveAsTar()])
        actions = {a[0]: a[1] for a in image.task["actions"] if isinstance(a, tuple)}
        assert actions[docker_command.docker_pull] == [
            "registry.invalid/project",
            "some-image",
            DIGEST,
        ]
        assert actions[docker_command.docker_tag] == [
            "registry.invalid/project/some-image",
            f"registry.invalid/project/some-image@{DIGEST}",
            "1.0.0",
        ]


class TestDigestOfTag:
    def test_hashes_the_raw_manifest_of_the_tag(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        commands: List[List[str]] = []

        def run(command: List[str], **_: Any) -> subprocess.CompletedProcess:
            commands.append(command)
            return subprocess.CompletedProcess(command, 0, b"manifest", b"")

        monkeypatch.setattr(remote_image.subprocess, "run", run)
        assert make_image().digest_of_tag() == digest_of(b"manifest")
        assert commands == [
            [
                *remote_image.constants.SKOPEO_INSPECT_RAW_ARGS,
                "docker://registry.invalid/project/some-image:1.0.0",
            ]
        ]


class TestOCILayout:
    def test_saved_by_default_next_to_the_layers(self) -> None:
        image = make_image()
        assert image.dirname / "manifest.json" in image.task["targets"]
        assert image.layout_dirname / "index.json" in image.task["targets"]

    def test_named_after_the_remote_name(self) -> None:
        image = make_image(remote_name="upstream-name")
        assert image.layout_dirname == Path(
            "/destination/registry.invalid/project/upstream-name"
        )

    def test_prepared_before_it_is_written(self) -> None:
        image = make_image(save_as=[SaveAsOCILayout()])
        assert image.task["actions"] == [
            image.prepare_layout,
            (remote_image.write_oci_layout, [image], {}),
        ]

    def test_tagged_with_the_pinned_digest(
        self, tmp_path: Path, upstream: Upstream
    ) -> None:
        image = write_layout(tmp_path, upstream)
        index = json.loads((image.layout_dirname / "index.json").read_text())
        assert index["manifests"] == [
            {
                "mediaType": LIST,
                "digest": upstream.pinned,
                "size": len(upstream.blobs[upstream.pinned]),
                "annotations": {"org.opencontainers.image.ref.name": "1.0.0"},
            }
        ]
        assert json.loads((image.layout_dirname / "oci-layout").read_text()) == {
            "imageLayoutVersion": "1.0.0"
        }

    def test_keeps_the_index_and_the_amd64_image_unchanged(
        self, tmp_path: Path, upstream: Upstream
    ) -> None:
        image = write_layout(tmp_path, upstream)
        amd64 = upstream.images["linux/amd64"]
        manifest = json.loads(upstream.blobs[amd64])
        kept = [upstream.pinned, amd64, manifest["config"]["digest"]]
        kept += [layer["digest"] for layer in manifest["layers"]]
        for digest in kept:
            assert blob(image, digest).read_bytes() == upstream.blobs[digest]
        assert len(list((image.layout_dirname / "blobs" / "sha256").iterdir())) == 4

    def test_copies_the_amd64_image_by_digest(
        self, tmp_path: Path, upstream: Upstream
    ) -> None:
        write_layout(tmp_path, upstream)
        copy = upstream.commands[-1]
        assert "--preserve-digests" in copy
        assert copy[-2] == (
            f"docker://registry.invalid/project/some-image@{upstream.images['linux/amd64']}"
        )

    def test_leaves_no_staging_behind(self, tmp_path: Path, upstream: Upstream) -> None:
        image = write_layout(tmp_path, upstream)
        assert sorted(p.name for p in image.layout_dirname.iterdir()) == [
            "blobs",
            "index.json",
            "oci-layout",
        ]

    def test_an_image_without_index_is_kept_as_is(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        upstream = Upstream(["linux/amd64"], indexed=False)
        monkeypatch.setattr(remote_image.subprocess, "run", upstream.run)
        image = write_layout(tmp_path, upstream)
        index = json.loads((image.layout_dirname / "index.json").read_text())
        assert index["manifests"][0]["mediaType"] == MANIFEST
        assert index["manifests"][0]["digest"] == upstream.pinned

    def test_an_image_without_amd64_is_an_error(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        upstream = Upstream(["linux/arm64"])
        monkeypatch.setattr(remote_image.subprocess, "run", upstream.run)
        with pytest.raises(ValueError, match="no linux/amd64 image"):
            write_layout(tmp_path, upstream)

    def test_a_manifest_not_matching_its_digest_is_an_error(
        self, tmp_path: Path, upstream: Upstream
    ) -> None:
        upstream.blobs[upstream.pinned] += b" "
        with pytest.raises(ValueError, match="expected a manifest of digest"):
            write_layout(tmp_path, upstream)

    def test_a_failing_skopeo_is_an_error(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def fail(command: List[str], **_: Any) -> subprocess.CompletedProcess:
            return subprocess.CompletedProcess(command, 1, b"", b"manifest unknown")

        monkeypatch.setattr(remote_image.subprocess, "run", fail)
        with pytest.raises(RuntimeError, match="manifest unknown"):
            write_layout(tmp_path, Upstream(["linux/amd64"]))

    def test_clean_removes_the_layout(self, tmp_path: Path) -> None:
        image = make_image(destination=tmp_path)
        (image.layout_dirname / "blobs").mkdir(parents=True)
        image.dirname.mkdir(parents=True)
        for clean in image.task["clean"]:
            clean()
        assert list(tmp_path.iterdir()) == []
