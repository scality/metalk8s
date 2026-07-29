# coding: utf-8

"""Unit tests for the archive output of `LocalImage`."""

from pathlib import Path
from typing import Any, List

from buildchain.targets.local_image import LocalImage


def make_image(**kwargs: Any) -> LocalImage:
    """A `LocalImage` with harmless defaults."""
    defaults: dict = {
        "name": "some-image",
        "version": "1.0.0",
        "dockerfile": Path("/context/Dockerfile"),
        "destination": Path("/destination"),
        "save_on_disk": True,
    }
    defaults.update(kwargs)
    return LocalImage(**defaults)


def flatten_actions(actions: List[Any]) -> str:
    """Render command-list actions as one searchable string."""
    return "\n".join(
        " ".join(map(str, action)) for action in actions if isinstance(action, list)
    )


REFERENCE = "registry.invalid/prefix/some-image:1.0.0"


class TestNoArchiveReference:
    """Without an `archive_reference`, the behavior stays what it always was."""

    def test_not_saved_as_tar(self) -> None:
        assert not make_image().save_as_tar

    def test_no_archive_target(self) -> None:
        image = make_image()
        assert image.tar_filepath not in image.task["targets"]

    def test_no_archive_action(self) -> None:
        image = make_image()
        assert "docker-archive:" not in flatten_actions(image.task["actions"])


class TestArchiveReference:
    def test_archive_is_a_target(self) -> None:
        image = make_image(archive_reference=REFERENCE)
        assert image.tar_filepath in image.task["targets"]
        assert image.tar_filepath == Path("/destination/some-image-1.0.0.tar")

    def test_layers_still_saved(self) -> None:
        image = make_image(archive_reference=REFERENCE)
        assert image.dirname / "manifest.json" in image.task["targets"]

    def test_archive_carries_the_reference(self) -> None:
        # The archive is imported as-is, so the name it carries is the whole
        # point of saving one: it is not the local tag.
        image = make_image(archive_reference=REFERENCE)
        actions = flatten_actions(image.task["actions"])
        assert f"docker-archive:{image.tar_filepath}:{REFERENCE}" in actions
        assert image.tag != REFERENCE

    def test_clean_removes_the_archive(self, tmp_path: Path) -> None:
        image = make_image(archive_reference=REFERENCE, destination=tmp_path)
        image.tar_filepath.touch()
        for clean in image.task["clean"]:
            clean()
        assert not image.tar_filepath.exists()

    def test_prepare_makes_room_for_skopeo(self, tmp_path: Path) -> None:
        # `docker-archive` refuses to write over an existing file, and the
        # destination directory may not exist yet on a fresh build tree.
        image = make_image(archive_reference=REFERENCE, destination=tmp_path / "images")
        prepare = image.task["actions"][-2]
        image.tar_filepath.parent.mkdir(parents=True)
        image.tar_filepath.touch()
        prepare()
        assert image.tar_filepath.parent.is_dir()
        assert not image.tar_filepath.exists()
