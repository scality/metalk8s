# coding: utf-8

"""Unit tests for the boot cache tasks of `buildchain.image`."""

from pathlib import Path
from typing import Any, List

import pytest

from buildchain import config, constants, image, versions

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
