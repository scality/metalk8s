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


REPOSITORY = "registry.invalid/project"


def oci_copy(image: LocalImage) -> str:
    """The skopeo command writing the OCI layout."""
    (action,) = (
        line
        for line in flatten_actions(image.task["actions"]).splitlines()
        if " oci:" in line
    )
    return action


class TestNoRepository:
    """Without a `repository`, there is no name to give the OCI layout."""

    def test_not_saved_as_oci_layout(self) -> None:
        image = make_image()
        assert not image.save_as_oci_layout
        assert " oci:" not in flatten_actions(image.task["actions"])

    def test_not_saved_when_not_on_disk(self) -> None:
        image = make_image(repository=REPOSITORY, save_on_disk=False)
        assert not image.save_as_oci_layout
        assert " oci:" not in flatten_actions(image.task["actions"])


class TestOCILayout:
    def test_named_after_the_repository(self) -> None:
        image = make_image(repository=REPOSITORY)
        assert image.layout_dirname == Path(
            "/destination/registry.invalid/project/some-image"
        )
        assert image.layout_dirname / "index.json" in image.task["targets"]

    def test_layers_still_saved(self) -> None:
        image = make_image(repository=REPOSITORY)
        assert image.dirname / "manifest.json" in image.task["targets"]

    def test_copied_from_the_daemon_under_its_version(self) -> None:
        image = make_image(repository=REPOSITORY)
        action = oci_copy(image)
        assert "--format oci" in action
        assert action.endswith(
            f"docker-daemon:{image.tag} oci:{image.layout_dirname}:1.0.0"
        )

    def test_prepared_before_the_copy(self) -> None:
        image = make_image(repository=REPOSITORY)
        actions = image.task["actions"]
        index = next(
            i
            for i, action in enumerate(actions)
            if isinstance(action, list) and str(action[-1]).startswith("oci:")
        )
        assert actions[index - 1] == image.prepare_layout

    def test_prepare_purges_the_previous_layout(self, tmp_path: Path) -> None:
        # skopeo adds to an existing layout: the previous version would ship.
        image = make_image(repository=REPOSITORY, destination=tmp_path)
        stale = image.layout_dirname / "blobs" / "sha256" / "stale"
        stale.parent.mkdir(parents=True)
        stale.touch()
        image.prepare_layout()
        assert not image.layout_dirname.exists()
        assert image.layout_dirname.parent.is_dir()

    def test_prepare_creates_the_parent(self, tmp_path: Path) -> None:
        # skopeo refuses to write a layout whose parent does not exist.
        image = make_image(repository=REPOSITORY, destination=tmp_path / "images")
        image.prepare_layout()
        assert image.layout_dirname.parent.is_dir()

    def test_clean_leaves_no_empty_parent(self, tmp_path: Path) -> None:
        # CI checks that `doit clean` leaves no `_build` behind.
        image = make_image(repository=REPOSITORY, destination=tmp_path)
        (image.layout_dirname / "blobs").mkdir(parents=True)
        for clean in image.task["clean"]:
            clean()
        assert tmp_path.is_dir()
        assert list(tmp_path.iterdir()) == []

    def test_clean_keeps_the_other_layouts(self, tmp_path: Path) -> None:
        image = make_image(repository=REPOSITORY, destination=tmp_path)
        other = make_image(
            name="other-image", repository=REPOSITORY, destination=tmp_path
        )
        image.layout_dirname.mkdir(parents=True)
        other.layout_dirname.mkdir(parents=True)
        image.clean_layout()
        assert not image.layout_dirname.exists()
        assert other.layout_dirname.is_dir()
