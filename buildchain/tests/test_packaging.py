# coding: utf-8

"""Unit tests for the prebuilt package tasks of `buildchain.packaging`."""

import hashlib
import http.client
import re
import urllib.error
from email.message import Message
from pathlib import Path
from typing import Any, Iterator

import pytest

from buildchain import packaging, targets, versions
from buildchain.targets import package

RELEASEVERS = tuple(versions.REDHAT_PACKAGES)

# Every EL release runs the whole suite: a new one is covered by declaring it.
releasevers = pytest.mark.parametrize("releasever", RELEASEVERS)

PACKAGE_NAME = "containerd-image-preload"
REPOSITORY = "scality/image-cache"
TAG = "v1.2.3"
CONTENT = b"not really an RPM, but it hashes the same way"
DIGEST = hashlib.sha256(CONTENT).hexdigest()


def prebuilt_package(
    tmp_path: Path, digest: str = DIGEST, full_version: str = "1.2.3-1.el8"
) -> package.PrebuiltRPMPackage:
    """A package pointing at a release served from the filesystem."""
    return package.PrebuiltRPMPackage(
        basename="_fetch_redhat_8_packages",
        name=PACKAGE_NAME,
        full_version=full_version,
        arch="noarch",
        repository=REPOSITORY,
        tag=TAG,
        digest=digest,
        destination_dir=tmp_path / "iso" / "metalk8s-scality-el8" / "x86_64",
    )


def prebuilt_declaration(name: str = PACKAGE_NAME) -> versions.PrebuiltRPM:
    """The declaration a prebuilt package is built from."""
    return next(
        prebuilt for prebuilt in versions.PREBUILT_RPMS if prebuilt.name == name
    )


def scality_repository(releasever: str) -> targets.RPMRepository:
    """The `scality` repository object for a given RedHat release."""
    return {
        "8": packaging.SCALITY_REDHAT_8_REPOSITORY,
        "9": packaging.SCALITY_REDHAT_9_REPOSITORY,
    }[releasever]


def run_actions(pkg: package.PrebuiltRPMPackage) -> None:
    """Run the task actions the way doit does."""
    for action in pkg.task["actions"]:
        action()


@pytest.fixture(name="release")
def release_fixture(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Serve a release from a local directory, over `file://`."""
    monkeypatch.setattr(
        package.PrebuiltRPMPackage,
        "GITHUB_RELEASES_URL",
        (tmp_path / "github").as_uri(),
    )
    assets = tmp_path / "github" / REPOSITORY / "releases" / "download" / TAG
    assets.mkdir(parents=True)
    yield assets


class TestPrebuiltRPMPackage:
    """The target itself: naming, download, and digest check."""

    def test_filename_follows_the_rpm_conventions(self, tmp_path: Path) -> None:
        pkg = prebuilt_package(tmp_path)
        assert pkg.path.name == f"{PACKAGE_NAME}-1.2.3-1.el8.noarch.rpm"
        assert pkg.path.parent == tmp_path / "iso" / "metalk8s-scality-el8" / "x86_64"

    def test_url_points_at_the_release_asset(self, tmp_path: Path) -> None:
        pkg = prebuilt_package(tmp_path)
        assert pkg.url == (
            f"https://github.com/{REPOSITORY}/releases/download/{TAG}/{pkg.path.name}"
        )

    def test_a_prerelease_asset_is_named_the_way_github_renames_it(
        self, tmp_path: Path
    ) -> None:
        # The RPM of a prerelease tag holds a tilde in its version, and GitHub
        # serves it as a dot. The package on disk keeps the name RPM gave it,
        # which is what the repository metadata and the version pin read.
        pkg = prebuilt_package(tmp_path, full_version="0.1.0~alpha.1-1.el8")
        assert pkg.path.name == f"{PACKAGE_NAME}-0.1.0~alpha.1-1.el8.noarch.rpm"
        assert pkg.asset_name == f"{PACKAGE_NAME}-0.1.0.alpha.1-1.el8.noarch.rpm"
        assert pkg.url.endswith(f"/{TAG}/{pkg.asset_name}")

    def test_a_prerelease_package_is_downloaded(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path, full_version="0.1.0~alpha.1-1.el8")
        (release / pkg.asset_name).write_bytes(CONTENT)

        run_actions(pkg)

        assert pkg.path.read_bytes() == CONTENT

    def test_task_is_named_after_the_package(self, tmp_path: Path) -> None:
        pkg = prebuilt_package(tmp_path)
        task = pkg.task
        assert task["basename"] == "_fetch_redhat_8_packages"
        assert task["name"] == PACKAGE_NAME
        assert task["targets"] == [pkg.path]

    def test_download_keeps_a_matching_package(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)

        run_actions(pkg)

        # The repository tree belongs to another task, which has not run yet.
        assert pkg.path.read_bytes() == CONTENT

    def test_download_rejects_another_package(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(b"some other build")

        with pytest.raises(RuntimeError, match="Wrong digest"):
            run_actions(pkg)

        # A rejected download must not leave a target behind, otherwise the
        # next build would consider the package up to date.
        assert not pkg.path.exists()

    def test_missing_asset_names_the_release(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path)

        with pytest.raises(RuntimeError, match=f"{REPOSITORY} {TAG}") as failure:
            run_actions(pkg)

        assert pkg.path.name in str(failure.value)

    def test_http_error_names_the_release(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def not_found(url: str, timeout: int = 0) -> None:
            raise urllib.error.HTTPError(url, 404, "Not Found", Message(), None)

        monkeypatch.setattr(package.urllib.request, "urlopen", not_found)
        pkg = prebuilt_package(tmp_path)

        with pytest.raises(RuntimeError, match="HTTP 404") as failure:
            run_actions(pkg)

        assert f"{REPOSITORY} {TAG}" in str(failure.value)

    def test_unpinned_digest_stops_the_build(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path, digest="")
        (release / pkg.path.name).write_bytes(CONTENT)

        with pytest.raises(RuntimeError, match=f"{REPOSITORY} {TAG}"):
            run_actions(pkg)


class TestPrebuiltRPMPackageDownload:
    """What the download does beyond fetching bytes."""

    def test_drops_the_previous_version(self, tmp_path: Path, release: Path) -> None:
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)
        stale = pkg.path.parent / f"{PACKAGE_NAME}-1.2.2-1.el8.noarch.rpm"
        stale.parent.mkdir(parents=True)
        stale.write_bytes(b"the package from the previous pin")
        neighbours = [
            pkg.path.parent / "metalk8s-sosreport-134.0.0-1.el8.x86_64.rpm",
            # Same prefix, different package: the version and the release of an
            # RPM hold no hyphen, which is what tells the two apart.
            pkg.path.parent / f"{PACKAGE_NAME}-tools-9.9.9-1.el8.noarch.rpm",
        ]
        for neighbour in neighbours:
            neighbour.write_bytes(b"another package of the same repository")

        run_actions(pkg)

        # Both versions in the directory would end up in the metadata.
        assert not stale.exists()
        assert all(neighbour.exists() for neighbour in neighbours)

    def test_leaves_nothing_behind_when_the_pin_is_missing(
        self, tmp_path: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path, digest="")

        with pytest.raises(RuntimeError, match="No SHA256 digest pinned"):
            run_actions(pkg)

        # Not even the directory: the mkdir task it belongs to would then be
        # considered done without having run.
        assert not pkg.path.parent.exists()

    def test_leaves_nothing_behind_when_the_digest_is_wrong(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path, digest="0" * 64)
        (release / pkg.path.name).write_bytes(CONTENT)

        with pytest.raises(RuntimeError, match="Wrong digest"):
            run_actions(pkg)

        # The half-written package would otherwise ship on the ISO, which
        # copies the repository directory as it is.
        assert list(pkg.path.parent.iterdir()) == []

    def test_drops_a_partial_file_from_an_earlier_build(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)
        partial = pkg.path.parent / f".{pkg.path.name}.part"
        partial.parent.mkdir(parents=True)
        partial.write_bytes(b"what a killed build left")

        run_actions(pkg)

        assert not partial.exists()
        assert pkg.path.read_bytes() == CONTENT

    def test_keeps_the_partial_file_of_another_package(
        self, tmp_path: Path, release: Path
    ) -> None:
        # `./doit.sh` runs tasks in parallel, so a partial whose name starts
        # like ours may well be another package being downloaded right now.
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)
        neighbour = (
            pkg.path.parent / f".{PACKAGE_NAME}-extras-1.0-1.el8.noarch.rpm.part"
        )
        neighbour.parent.mkdir(parents=True)
        neighbour.write_bytes(b"a download in flight")

        run_actions(pkg)

        assert neighbour.exists()

    def test_accepts_a_pin_written_the_other_way(
        self, tmp_path: Path, release: Path
    ) -> None:
        # `versions.py` writes container image digests as `sha256:<hex>`, and
        # the release page shows them upper case.
        pkg = prebuilt_package(tmp_path, digest=f"  SHA256:{DIGEST.upper()}  ")
        (release / pkg.path.name).write_bytes(CONTENT)

        run_actions(pkg)

        assert pkg.path.read_bytes() == CONTENT

    def test_rejects_a_pin_that_is_not_a_digest(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path, digest="1.2.3")
        (release / pkg.path.name).write_bytes(CONTENT)

        with pytest.raises(RuntimeError, match="not a SHA256 digest"):
            run_actions(pkg)

    def test_broken_connection_names_the_release(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # A connection that drops mid-read raises none of the `urllib` errors.
        class Truncated:
            """A response that dies while it is being read."""

            def __enter__(self) -> "Truncated":
                return self

            def __exit__(self, *args: Any) -> None:
                return None

            def read(self, size: int = 0) -> bytes:
                raise http.client.IncompleteRead(b"half of it")

        monkeypatch.setattr(
            package.urllib.request,
            "urlopen",
            lambda url, timeout=0: Truncated(),
        )

        with pytest.raises(RuntimeError, match=f"{REPOSITORY} {TAG}"):
            run_actions(prebuilt_package(tmp_path))


class TestPrebuiltRPMPackageUpToDate:
    """What keeps the build off the network once the package is there."""

    def test_a_matching_package_is_up_to_date(
        self, tmp_path: Path, release: Path
    ) -> None:
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)
        assert not pkg.is_up_to_date()

        run_actions(pkg)

        assert pkg.is_up_to_date()

    def test_a_truncated_package_is_not(self, tmp_path: Path, release: Path) -> None:
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)
        run_actions(pkg)

        # An interrupted build, or a hand-edited package: the pin alone cannot
        # tell, only the bytes on disk can.
        pkg.path.write_bytes(CONTENT[:10])

        assert not pkg.is_up_to_date()

    def test_a_package_left_by_another_pin_makes_it_run_again(
        self, tmp_path: Path, release: Path
    ) -> None:
        # The cleanup only runs on download. A build killed between the two
        # leaves both versions in the directory, and `createrepo` would index
        # them both.
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)
        run_actions(pkg)
        stale = pkg.path.parent / f"{PACKAGE_NAME}-1.2.2-1.el8.noarch.rpm"
        stale.write_bytes(b"the package from the previous pin")

        assert not pkg.is_up_to_date()

        run_actions(pkg)

        assert not stale.exists()
        assert pkg.is_up_to_date()

    def test_a_bumped_pin_is_not(self, tmp_path: Path, release: Path) -> None:
        pkg = prebuilt_package(tmp_path)
        (release / pkg.path.name).write_bytes(CONTENT)
        run_actions(pkg)

        assert not prebuilt_package(tmp_path, digest="0" * 64).is_up_to_date()

    def test_a_missing_pin_is_not(self, tmp_path: Path) -> None:
        assert not prebuilt_package(tmp_path, digest="").is_up_to_date()

    def test_the_checks_handed_to_the_target_are_kept(self, tmp_path: Path) -> None:
        pkg = package.PrebuiltRPMPackage(
            basename="_fetch_redhat_8_packages",
            name=PACKAGE_NAME,
            full_version="1.2.3-1.el8",
            arch="noarch",
            repository=REPOSITORY,
            tag=TAG,
            digest=DIGEST,
            destination_dir=tmp_path / "repository",
            uptodate=[False],
        )
        assert pkg.task["uptodate"] == [False, pkg.is_up_to_date]


class TestContainerdImagePreload:
    """The wiring: where the package is declared, fetched, and shipped."""

    @releasevers
    def test_version_is_declared(self, releasever: str) -> None:
        # `pkg_installed` pins the version from this listing, so a package
        # missing from it cannot be installed by the Salt states.
        prebuilt = prebuilt_declaration()
        pkg_info = versions.REDHAT_PACKAGES_MAP[releasever][PACKAGE_NAME]
        assert pkg_info.full_version == (
            f"{prebuilt.version}-{prebuilt.release}.el{releasever}"
        )

    @releasevers
    def test_the_version_pin_is_generated(self, releasever: str) -> None:
        # The pin is not written by hand next to the declaration: a bump moves
        # the tag, and the version every node installs follows.
        prebuilt = prebuilt_declaration()
        assert (
            prebuilt.package_version(releasever).full_version
            == versions.REDHAT_PACKAGES_MAP[releasever][PACKAGE_NAME].full_version
        )

    @releasevers
    def test_dnf_does_not_try_to_download_it(self, releasever: str) -> None:
        # The package is in none of the yum repositories we configure: asking
        # `dnf` for it would fail the whole download task.
        assert not [
            name
            for name in packaging.REDHAT_PACKAGES_TO_DOWNLOAD[releasever]
            if name.startswith(PACKAGE_NAME)
        ]

    @releasevers
    def test_lands_in_the_scality_repository(self, releasever: str) -> None:
        pkg = packaging.RPM_TO_FETCH["scality"][releasever][0]
        repository = scality_repository(releasever)
        assert pkg.path.parent == repository.package_dir
        # `rpm_package_dir` lets a package know where it lands before the
        # repository exists. It has to stay the directory the repository
        # metadata is built from, otherwise the ISO ships a package `dnf`
        # cannot see.
        assert repository.package_dir.parent == repository.rootdir

    def test_lands_in_the_repository_it_is_declared_under(self) -> None:
        # The repository the package is declared under and the directory it
        # lands in come from the same name, so the two cannot diverge.
        for repo, per_release in packaging.RPM_TO_FETCH.items():
            for releasever, packages in per_release.items():
                for pkg in packages:
                    assert pkg.path.parent == targets.rpm_package_dir(repo, releasever)

    def test_every_declared_release_is_fetched(self) -> None:
        # A release declared in `versions.py` but missing here would have dnf
        # look for the package in repositories that do not carry it.
        assert set(packaging.RPM_TO_FETCH["scality"]) == set(versions.REDHAT_PACKAGES)

    @releasevers
    def test_repository_metadata_depends_on_it(self, releasever: str) -> None:
        repository = scality_repository(releasever)
        pkg = packaging.RPM_TO_FETCH["scality"][releasever][0]
        assert pkg.path in repository.build_repo()["file_dep"]

    @releasevers
    def test_is_cleaned_before_the_directory_holding_it(self, releasever: str) -> None:
        # `doit clean` cleans a task before the tasks it depends on. Nothing
        # else orders these two, and the ISO build fails on the `rmdir` of a
        # repository directory that still holds the package.
        pkg = packaging.RPM_TO_FETCH["scality"][releasever][0]
        assert (
            f"_build_redhat_{releasever}_repositories:"
            f"scality/{targets.MKDIR_ARCH_TASK_NAME}"
        ) in pkg.task["task_dep"]

    @releasevers
    def test_has_a_fetch_task(self, releasever: str) -> None:
        tasks = {
            "8": packaging.task__fetch_redhat_8_packages,
            "9": packaging.task__fetch_redhat_9_packages,
        }[releasever]()
        assert [task["name"] for task in tasks] == [PACKAGE_NAME]

    def test_digests_are_pinned(self) -> None:
        # A bump moves the tag and every digest together: a half-done one
        # leaves a digest empty, and the build would only find out on the
        # download.
        for prebuilt in versions.PREBUILT_RPMS:
            assert set(prebuilt.sha256) == set(RELEASEVERS)
            for digest in prebuilt.sha256.values():
                assert re.fullmatch(r"[0-9a-f]{64}", digest)

    @releasevers
    def test_its_dependency_ships_on_the_iso(self, releasever: str) -> None:
        # The RPM requires `containerd`, which `containerd.io` provides. Every
        # declared package is test-installed on each node by
        # `metalk8s_package_manager.check_pkg_availability`, against the ISO
        # repositories alone, so an unshipped dependency fails that state
        # cluster-wide.
        assert "containerd.io" in versions.REDHAT_PACKAGES_MAP[releasever]

    def test_rpm_version_comes_from_the_tag(self) -> None:
        # `rpm/build.sh` in image-cache drops the leading "v" and replaces the
        # hyphen, which RPM forbids in a version, with a tilde.
        prebuilt = prebuilt_declaration()
        assert prebuilt.tag.startswith("v")
        assert not prebuilt.version.startswith("v")
        assert "-" not in prebuilt.version


class TestPackageNames:
    """The listing that decides which packages `dnf` is asked for."""

    def test_repositories_sharing_a_release_are_merged(self) -> None:
        built = {"scality": {"8": (Named("built"),)}}
        fetched = {"epel": {"8": (Named("fetched"),)}}
        names = packaging._list_package_names(built, fetched)
        assert sorted(names["8"]) == ["built", "fetched"]


class Named:
    """The only thing `_list_package_names` reads from a package."""

    def __init__(self, name: str):
        self.name = name
