# coding: utf-8

"""Unit tests for the tasks of `buildchain.image`."""

import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pytest

from buildchain import config, constants, image, versions
from buildchain.targets import RemoteImage

VARIANTS = sorted(image.BOOT_CACHE_VARIANTS)

# Every variant runs the whole suite: a new one is covered by declaring it.
variants = pytest.mark.parametrize("variant", VARIANTS)


def members_of(variant: str) -> List[Any]:
    """The images a variant caches, as pulled image targets."""
    return [image.TO_PULL[name] for name in image.BOOT_CACHE_VARIANTS[variant]]


def command_actions(task: dict) -> List[str]:
    """Render the command-list actions of a task as searchable strings."""
    return [
        " ".join(map(str, action))
        for action in task["actions"]
        if isinstance(action, list)
    ]


class TestBootCacheVariants:
    """The manifest itself: every declared name must stay resolvable."""

    def test_members_are_pulled_images(self) -> None:
        for variant, members in image.BOOT_CACHE_VARIANTS.items():
            missing = [name for name in members if name not in image.TO_PULL]
            assert not missing, f"variant {variant} lists unknown images: {missing}"

    def test_every_variant_is_built(self) -> None:
        built = {img.name for img in image.TO_BUILD}
        for variant in image.BOOT_CACHE_VARIANTS:
            assert f"metalk8s-boot-cache-{variant}" in built

    def test_variant_versions_are_declared(self) -> None:
        # The version listing feeds the Salt `repo.images` map: a boot cache
        # image missing from it would break `build_image_name` at render time.
        for variant in image.BOOT_CACHE_VARIANTS:
            assert f"metalk8s-boot-cache-{variant}" in versions.CONTAINER_IMAGES_MAP


class TestNodeImageFullname:
    def test_matches_the_registry_layout(self) -> None:
        prefix = f"{config.PROJECT_NAME.lower()}-{versions.VERSION}"
        assert image._node_image_fullname("etcd", "1.2.3") == (
            f"{constants.NODE_REGISTRY_ENDPOINT}/{prefix}/etcd:1.2.3"
        )


class TestBootCacheRoot:
    """`doit clean` has to end with no `_build` left at all."""

    def test_the_staging_root_is_owned_by_a_task(self) -> None:
        # Each variant only cleans what it created. Without a task owning the
        # root, an empty `_build/boot-cache` survives the clean and keeps
        # the build root from being removed, which CI checks with
        # `./doit.sh clean && test ! -d _build`.
        task = image.task__image_boot_cache_mkdir_root()
        assert constants.BOOT_CACHE_ROOT in task["targets"]

    @variants
    def test_contexts_are_built_under_that_root(self, variant: str) -> None:
        task = image._boot_cache_context_task(variant)
        assert "_image_boot_cache_mkdir_root" in task["task_dep"]


class TestBootCacheContextTask:
    def test_unknown_image_is_a_clear_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setitem(image.BOOT_CACHE_VARIANTS, "broken", ["not-pulled"])
        with pytest.raises(ValueError, match="not-pulled"):
            image._boot_cache_context_task("broken")

    @variants
    def test_one_archive_per_member(self, variant: str) -> None:
        task = image._boot_cache_context_task(variant)
        expected = [
            constants.BOOT_CACHE_ROOT
            / variant
            / "images"
            / f"{member.name}-{member.version}.tar"
            for member in members_of(variant)
        ]
        assert task["targets"] == expected

    @variants
    def test_archives_depend_on_the_pulled_layers(self, variant: str) -> None:
        task = image._boot_cache_context_task(variant)
        assert task["file_dep"] == [
            member.dirname / "manifest.json" for member in members_of(variant)
        ]

    @variants
    def test_archives_convert_layers_and_carry_the_node_name(
        self, variant: str
    ) -> None:
        task = image._boot_cache_context_task(variant)
        actions = command_actions(task)
        members = members_of(variant)
        assert len(actions) == len(members)
        for member, archive, action in zip(
            members, task["targets"], actions, strict=True
        ):
            assert f"dir:{member.dirname}" in action
            reference = image._node_image_fullname(member.name, member.version)
            assert f"docker-archive:{archive}:{reference}" in action

    @variants
    def test_prepare_purges_stale_archives(
        self, variant: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # The whole context directory ends up in the image: an archive left
        # over from a previous version bump must not survive a re-run.
        monkeypatch.setattr(constants, "BOOT_CACHE_ROOT", tmp_path)
        task = image._boot_cache_context_task(variant)
        images_dir = tmp_path / variant / "images"
        images_dir.mkdir(parents=True)
        (images_dir / "etcd-0.0.0-stale.tar").touch()
        prepare = task["actions"][0]
        prepare()
        assert images_dir.is_dir()
        assert list(images_dir.iterdir()) == []


class TestBootCacheImage:
    @staticmethod
    def image_of(variant: str) -> Any:
        (img,) = (
            img
            for img in image.TO_BUILD
            if img.name == f"metalk8s-boot-cache-{variant}"
        )
        return img

    @variants
    def test_waits_for_its_context(self, variant: str) -> None:
        assert f"_image_boot_cache_context:{variant}" in self.image_of(variant).task_dep

    @variants
    def test_builds_from_the_assembled_context(self, variant: str) -> None:
        assert self.image_of(variant).build_context == (
            constants.BOOT_CACHE_ROOT / variant
        )

    @variants
    def test_ships_both_layers_and_archive(self, variant: str) -> None:
        # Same double output as `pause` and `nginx`: layers for the registry,
        # an archive for nodes that have no registry yet.
        img = self.image_of(variant)
        assert img.save_on_disk
        assert img.save_as_tar

    @variants
    def test_archive_carries_the_node_name(self, variant: str) -> None:
        img = self.image_of(variant)
        assert img.archive_reference == image._node_image_fullname(
            img.name, img.version
        )


class TestOCILayouts:
    """Every image on the ISO also gets an OCI layout, under its full name."""

    @staticmethod
    def saved_images() -> List[Any]:
        built = [img for img in image.TO_BUILD if img.save_on_disk]
        return [*image.TO_PULL.values(), *built]

    def test_every_saved_image_gets_one(self) -> None:
        for img in self.saved_images():
            assert img.layout_dirname / "index.json" in img.task["targets"]

    def test_built_images_are_named_after_the_metalk8s_repository(self) -> None:
        # Boot cache images included: they are built locally too.
        for img in image.TO_BUILD:
            assert img.layout_dirname == (
                constants.ISO_IMAGE_ROOT / constants.METALK8S_REPOSITORY / img.name
            )

    def test_layouts_do_not_overlap(self) -> None:
        layouts = [img.layout_dirname for img in self.saved_images()]
        assert len(set(layouts)) == len(layouts)
        for layout in layouts:
            assert not any(layout in other.parents for other in layouts)

    def test_layouts_stay_out_of_the_layers_tree(self) -> None:
        # Cleaning an image removes `<root>/<name>`: it must hold no layout.
        layer_dirs = {img.dest_dir / img.name for img in self.saved_images()}
        for img in self.saved_images():
            assert not layer_dirs.intersection(img.layout_dirname.parents)


class TestCheckImagePins:
    OTHER_DIGEST = "sha256:" + "f" * 64

    @pytest.fixture(name="checked")
    def fixture_checked(self, monkeypatch: pytest.MonkeyPatch) -> List[str]:
        """The images whose tag gets looked up, all found as pinned."""
        checked: List[str] = []

        def digest_of_tag(img: RemoteImage) -> str:
            checked.append(img.name)
            return str(img.digest)

        monkeypatch.setattr(RemoteImage, "digest_of_tag", digest_of_tag)
        return checked

    @staticmethod
    def current_pins() -> Dict[str, Tuple[str, Optional[str]]]:
        return {img.name: (img.version, img.digest) for img in image.TO_PULL.values()}

    def test_every_image_without_a_base(self, checked: List[str]) -> None:
        assert image._check_image_pins(base="")
        assert sorted(checked) == sorted(image.TO_PULL)

    def test_only_the_changed_pins_with_a_base(
        self, checked: List[str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        previous = self.current_pins()
        previous["pause"] = ("0.0.1", previous["pause"][1])
        del previous["nginx"]
        monkeypatch.setattr(image, "_image_pins_at", lambda _: previous)
        assert image._check_image_pins(base="origin/main")
        assert sorted(checked) == ["nginx", "pause"]

    def test_nothing_when_no_pin_changed(
        self, checked: List[str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(image, "_image_pins_at", lambda _: self.current_pins())
        assert image._check_image_pins(base="origin/main")
        assert not checked

    def test_a_moved_tag_fails(
        self, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
    ) -> None:
        monkeypatch.setattr(RemoteImage, "digest_of_tag", lambda _: self.OTHER_DIGEST)
        assert not image._check_image_pins(base="")
        assert f"points to {self.OTHER_DIGEST}" in capsys.readouterr().out

    def test_pins_are_read_from_versions_py_at_the_revision(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        source = (
            "from collections import namedtuple\n"
            "Image = namedtuple('Image', ('name', 'version', 'digest'))\n"
            "CONTAINER_IMAGES = (Image('pause', '3.9', 'sha256:abc'),)\n"
        )
        commands: List[List[str]] = []

        def run(command: List[str], **_: Any) -> subprocess.CompletedProcess:
            commands.append(command)
            return subprocess.CompletedProcess(command, 0, source, "")

        monkeypatch.setattr(image.subprocess, "run", run)
        assert image._image_pins_at("origin/main") == {"pause": ("3.9", "sha256:abc")}
        assert commands[0][-2:] == [
            "show",
            "origin/main:buildchain/buildchain/versions.py",
        ]

    def test_an_unknown_revision_is_an_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def run(command: List[str], **_: Any) -> subprocess.CompletedProcess:
            return subprocess.CompletedProcess(command, 128, "", "bad revision")

        monkeypatch.setattr(image.subprocess, "run", run)
        with pytest.raises(RuntimeError, match="bad revision"):
            image._image_pins_at("nope")
