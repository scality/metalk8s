# coding: utf-8

"""Unit tests for `RemoteImage`."""

from pathlib import Path
from typing import Any, Optional

import pytest

from buildchain import docker_command
from buildchain.targets.remote_image import RemoteImage, SaveAsLayers, SaveAsTar

DIGEST = "sha256:" + "0" * 64


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


def oci_copy(image: RemoteImage) -> str:
    """The skopeo command writing the OCI layout."""
    (action,) = (
        " ".join(map(str, action))
        for action in image.task["actions"]
        if isinstance(action, list) and str(action[-1]).startswith("oci:")
    )
    return action


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

    def test_copied_from_upstream_by_digest(self) -> None:
        image = make_image()
        action = oci_copy(image)
        assert "--format oci" in action
        assert action.endswith(
            f"docker://registry.invalid/project/some-image@{DIGEST} "
            f"oci:{image.layout_dirname}:1.0.0"
        )

    def test_prepared_before_the_copy(self) -> None:
        image = make_image()
        actions = image.task["actions"]
        index = next(
            i
            for i, action in enumerate(actions)
            if isinstance(action, list) and str(action[-1]).startswith("oci:")
        )
        assert actions[index - 1] == image.prepare_layout

    def test_clean_removes_the_layout(self, tmp_path: Path) -> None:
        image = make_image(destination=tmp_path)
        (image.layout_dirname / "blobs").mkdir(parents=True)
        image.dirname.mkdir(parents=True)
        for clean in image.task["clean"]:
            clean()
        assert list(tmp_path.iterdir()) == []
