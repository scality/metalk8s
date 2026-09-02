import io
import json
import os
import tarfile
import tempfile
from unittest import TestCase
from unittest.mock import patch

from parameterized import parameterized
from salt.exceptions import CommandExecutionError

from _modules import metalk8s_image_cache

from tests.unit import mixins


def layer_bytes(files):
    """Build the single layer of a boot cache image.

    Carries a directory entry as well, since the real image has one and the
    extraction must ignore anything that is not a regular file.
    """
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w") as layer:
        directory = tarfile.TarInfo("images")
        directory.type = tarfile.DIRTYPE
        layer.addfile(directory)
        for name, content in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(content)
            layer.addfile(info, io.BytesIO(content))
    return buffer.getvalue()


def write_directory_archive(path, name):
    """Write a tar archive holding `name` as a directory entry."""
    with tarfile.open(path, "w") as archive:
        info = tarfile.TarInfo(name)
        info.type = tarfile.DIRTYPE
        archive.addfile(info)
    return path


def write_archive(path, members):
    """Write a tar archive at `path` from a name to bytes mapping."""
    with tarfile.open(path, "w") as archive:
        for name, content in members.items():
            info = tarfile.TarInfo(name)
            info.size = len(content)
            archive.addfile(info, io.BytesIO(content))
    return path


def make_boot_cache_image(path, files, layer_count=1, manifest=None):
    """Write a docker archive shaped like a boot cache image at `path`."""
    layer = layer_bytes(
        {"images/{}".format(name): data for name, data in files.items()}
    )
    members = {}
    layers = []
    for index in range(layer_count):
        name = "layer{}.tar".format(index)
        members[name] = layer
        layers.append(name)
    if manifest is None:
        manifest = [{"Layers": layers}]
    members["manifest.json"] = json.dumps(manifest).encode()
    return write_archive(path, members)


class Metalk8sImageCacheTestCase(TestCase, mixins.LoaderModuleMockMixin):
    """
    TestCase for `metalk8s_image_cache` module
    """

    loader_module = metalk8s_image_cache

    def setUp(self):  # pylint: disable=invalid-name
        super().setUp()
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dest = self.path("image-cache")
        os.mkdir(self.dest)

    def path(self, *parts):
        """Return a path inside the test's temporary directory."""
        return os.path.join(self._tmp.name, *parts)

    def content(self, name):
        """Return the content of an archive sitting in the cache directory."""
        with open(os.path.join(self.dest, name), "rb") as archive:
            return archive.read()

    def test_virtual(self):
        """
        Tests the return of `__virtual__` function
        """
        self.assertEqual(metalk8s_image_cache.__virtual__(), "metalk8s_image_cache")

    def test_provision(self):
        """
        Tests the return of `provision` function
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"),
            {"etcd-3.5.21.tar": b"etcd", "pause-3.10.tar": b"pause!"},
        )

        self.assertEqual(
            metalk8s_image_cache.provision(source, self.dest),
            {"extracted": ["etcd-3.5.21.tar", "pause-3.10.tar"], "present": []},
        )
        self.assertEqual(
            sorted(os.listdir(self.dest)), ["etcd-3.5.21.tar", "pause-3.10.tar"]
        )
        self.assertEqual(self.content("etcd-3.5.21.tar"), b"etcd")
        self.assertEqual(self.content("pause-3.10.tar"), b"pause!")

    def test_provision_is_idempotent(self):
        """
        Tests that `provision` leaves an archive of the expected size alone
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"), {"etcd.tar": b"etcd"}
        )
        # Same size, different content: proves the file was not rewritten.
        with open(os.path.join(self.dest, "etcd.tar"), "wb") as archive:
            archive.write(b"keep")

        self.assertEqual(
            metalk8s_image_cache.provision(source, self.dest),
            {"extracted": [], "present": ["etcd.tar"]},
        )
        self.assertEqual(self.content("etcd.tar"), b"keep")

    def test_provision_replaces_a_truncated_archive(self):
        """
        Tests that `provision` rewrites an archive whose size does not match
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"), {"etcd.tar": b"etcd"}
        )
        with open(os.path.join(self.dest, "etcd.tar"), "wb") as archive:
            archive.write(b"")

        self.assertEqual(
            metalk8s_image_cache.provision(source, self.dest),
            {"extracted": ["etcd.tar"], "present": []},
        )
        self.assertEqual(self.content("etcd.tar"), b"etcd")

    def test_provision_dry_run(self):
        """
        Tests that `provision` writes nothing when asked for a dry run
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"), {"etcd.tar": b"etcd"}
        )

        self.assertEqual(
            metalk8s_image_cache.provision(source, self.dest, dry_run=True),
            {"extracted": ["etcd.tar"], "present": []},
        )
        self.assertEqual(os.listdir(self.dest), [])

    def test_provision_removes_its_temporary_file_on_failure(self):
        """
        Tests that a failed write leaves no temporary file behind
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"), {"etcd.tar": b"etcd"}
        )

        with patch(
            "shutil.copyfileobj", side_effect=OSError("No space left on device")
        ):
            self.assertRaisesRegex(
                CommandExecutionError,
                "No space left on device",
                metalk8s_image_cache.provision,
                source,
                self.dest,
            )
        self.assertEqual(os.listdir(self.dest), [])

    def test_provision_missing_source(self):
        """
        Tests that `provision` refuses a source that is not a file
        """
        self.assertRaisesRegex(
            CommandExecutionError,
            "is not a file",
            metalk8s_image_cache.provision,
            self.path("boot-cache.tar"),
            self.dest,
        )

    def test_provision_unreadable_source(self):
        """
        Tests that `provision` refuses a source that is not a tar archive
        """
        source = self.path("boot-cache.tar")
        with open(source, "wb") as not_a_tar:
            not_a_tar.write(b"definitely not a tar archive")

        self.assertRaisesRegex(
            CommandExecutionError,
            "is not a readable archive",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_missing_dest(self):
        """
        Tests that `provision` refuses a cache directory that does not exist
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"), {"etcd.tar": b"etcd"}
        )
        self.assertRaisesRegex(
            CommandExecutionError,
            "is not a directory",
            metalk8s_image_cache.provision,
            source,
            self.path("nowhere"),
        )

    def test_provision_without_manifest(self):
        """
        Tests that `provision` refuses an archive carrying no manifest
        """
        source = write_archive(self.path("boot-cache.tar"), {"hello": b""})
        self.assertRaisesRegex(
            CommandExecutionError,
            "carries no manifest.json",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    @parameterized.expand(
        [
            ("not_json", b"{", "is not valid JSON"),
            ("not_a_list", b'{"Layers": []}', "Unexpected manifest.json"),
            ("no_layers", b"[{}]", "Unexpected manifest.json"),
        ]
    )
    def test_provision_broken_manifest(self, _name, blob, message):
        """
        Tests that `provision` refuses a manifest it cannot read
        """
        source = write_archive(self.path("boot-cache.tar"), {"manifest.json": blob})
        self.assertRaisesRegex(
            CommandExecutionError,
            message,
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    @parameterized.expand([("none", 0), ("two", 2)])
    def test_provision_wrong_layer_count(self, _name, layer_count):
        """
        Tests that `provision` refuses anything but a single layer

        The boot cache image is built `FROM scratch` with a single `COPY`, so
        a second layer means it is no longer the flat carrier we read here.
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"),
            {"etcd.tar": b"etcd"},
            layer_count=layer_count,
        )
        self.assertRaisesRegex(
            CommandExecutionError,
            "exactly one layer",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_missing_layer(self):
        """
        Tests that `provision` refuses a manifest naming an absent layer
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"),
            {"etcd.tar": b"etcd"},
            manifest=[{"Layers": ["nowhere.tar"]}],
        )
        self.assertRaisesRegex(
            CommandExecutionError,
            "does not carry its layer",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_duplicate_names(self):
        """
        Tests that `provision` refuses two archives sharing a base name

        Everything lands flat in the cache directory, so two members that
        differ only by directory would silently overwrite each other.
        """
        layer = layer_bytes({"images/etcd.tar": b"etcd", "other/etcd.tar": b"etcd"})
        source = write_archive(
            self.path("boot-cache.tar"),
            {
                "layer0.tar": layer,
                "manifest.json": json.dumps([{"Layers": ["layer0.tar"]}]).encode(),
            },
        )
        self.assertRaisesRegex(
            CommandExecutionError,
            "twice",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )
        # All or nothing: the headers are checked before anything is written,
        # so the timer never sees the part of a refused image.
        self.assertEqual(os.listdir(self.dest), [])

    def test_provision_with_a_manifest_that_is_not_a_file(self):
        """
        Tests that `provision` refuses a manifest that is not a regular file
        """
        source = write_directory_archive(self.path("boot-cache.tar"), "manifest.json")
        self.assertRaisesRegex(
            CommandExecutionError,
            "manifest.json.*is not a regular file",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_with_a_layer_that_is_not_a_file(self):
        """
        Tests that `provision` refuses a layer that is not a regular file
        """
        source = self.path("boot-cache.tar")
        with tarfile.open(source, "w") as archive:
            info = tarfile.TarInfo("layer0.tar")
            info.type = tarfile.DIRTYPE
            archive.addfile(info)
            blob = json.dumps([{"Layers": ["layer0.tar"]}]).encode()
            info = tarfile.TarInfo("manifest.json")
            info.size = len(blob)
            archive.addfile(info, io.BytesIO(blob))

        self.assertRaisesRegex(
            CommandExecutionError,
            'layer "layer0.tar".*is not a regular file',
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_with_a_member_that_is_not_a_file(self):
        """
        Tests that `provision` refuses to skip a member it cannot copy

        A hard link or a symlink would leave the cache short of an image the
        kubelet needs, while every other archive reported as extracted.
        """
        layer = io.BytesIO()
        with tarfile.open(fileobj=layer, mode="w") as inner:
            info = tarfile.TarInfo("images/etcd.tar")
            info.size = 4
            inner.addfile(info, io.BytesIO(b"etcd"))
            link = tarfile.TarInfo("images/pause.tar")
            link.type = tarfile.SYMTYPE
            link.linkname = "etcd.tar"
            inner.addfile(link)

        source = write_archive(
            self.path("boot-cache.tar"),
            {
                "layer0.tar": layer.getvalue(),
                "manifest.json": json.dumps([{"Layers": ["layer0.tar"]}]).encode(),
            },
        )
        self.assertRaisesRegex(
            CommandExecutionError,
            "which is not a regular file",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_with_an_empty_image(self):
        """
        Tests that `provision` refuses an image carrying no archive

        Reported as a success, an empty cache would release the kubelet on a
        node with no registry to pull from.
        """
        source = make_boot_cache_image(self.path("boot-cache.tar"), {})
        self.assertRaisesRegex(
            CommandExecutionError,
            "carries no archive",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_dry_run_without_the_cache_directory(self):
        """
        Tests that a dry run reports the archives before the cache exists

        The state that creates the directory changes nothing under
        `test=True`, so a dry run has to cope with it missing.
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"), {"etcd.tar": b"etcd"}
        )
        self.assertEqual(
            metalk8s_image_cache.provision(source, self.path("nowhere"), dry_run=True),
            {"extracted": ["etcd.tar"], "present": []},
        )

    def test_provision_with_several_images(self):
        """
        Tests that `provision` refuses an archive carrying several images

        Only the first image would be extracted, and the archives of the
        others would go missing without a word.
        """
        source = make_boot_cache_image(
            self.path("boot-cache.tar"),
            {"etcd.tar": b"etcd"},
            manifest=[{"Layers": ["layer0.tar"]}, {"Layers": ["layer0.tar"]}],
        )
        self.assertRaisesRegex(
            CommandExecutionError,
            "exactly one image",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_with_a_member_without_a_name(self):
        """
        Tests that `provision` names the member when its base name is empty
        """
        layer = io.BytesIO()
        with tarfile.open(fileobj=layer, mode="w") as inner:
            info = tarfile.TarInfo("images/")
            info.size = 0
            inner.addfile(info, io.BytesIO(b""))

        source = write_archive(
            self.path("boot-cache.tar"),
            {
                "layer0.tar": layer.getvalue(),
                "manifest.json": json.dumps([{"Layers": ["layer0.tar"]}]).encode(),
            },
        )
        self.assertRaisesRegex(
            CommandExecutionError,
            "which has no file name",
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )

    def test_provision_writes_nothing_when_a_later_member_is_refused(self):
        """
        Tests that a refused member leaves the cache untouched

        The preload script globs the directory whatever the state reported,
        so a prefix of a refused image would be imported as if it were whole.
        """
        layer = io.BytesIO()
        with tarfile.open(fileobj=layer, mode="w") as inner:
            info = tarfile.TarInfo("images/etcd.tar")
            info.size = 4
            inner.addfile(info, io.BytesIO(b"etcd"))
            link = tarfile.TarInfo("images/pause.tar")
            link.type = tarfile.SYMTYPE
            link.linkname = "etcd.tar"
            inner.addfile(link)

        source = write_archive(
            self.path("boot-cache.tar"),
            {
                "layer0.tar": layer.getvalue(),
                "manifest.json": json.dumps([{"Layers": ["layer0.tar"]}]).encode(),
            },
        )
        self.assertRaises(
            CommandExecutionError,
            metalk8s_image_cache.provision,
            source,
            self.dest,
        )
        self.assertEqual(os.listdir(self.dest), [])
