import io
import json
import os
import signal
import subprocess
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


def registry_manifest(digest, layer_count=1):
    """Build the image manifest a registry serves, in its own schema."""
    return json.dumps(
        {
            "schemaVersion": 2,
            "layers": [{"digest": digest} for _ in range(layer_count)],
        }
    ).encode()


class BrokenPipe(io.RawIOBase):
    """The standard output of the stand-in, which notices an early close.

    A reader that gives up before the end leaves the command writing into a
    pipe nobody holds, and it dies of `SIGPIPE`. Python reports that as a
    negative return code. Without this, a stand-in always reports the code it
    was given, and no test can tell the two kinds of failure apart.
    """

    def __init__(self, data, process):
        super().__init__()
        self._data = io.BytesIO(data)
        self._process = process

    def readable(self):
        return True

    def seekable(self):
        return False

    def readinto(self, buffer):
        return self._data.readinto(buffer)

    def close(self):
        if not self.closed and self._data.read(1):
            self._process.returncode = -signal.SIGPIPE
        super().close()


class FakeProcess:
    """Stand in for the `ctr` process `subprocess.Popen` would start."""

    def __init__(self, stdout=b"", returncode=0):
        self.returncode = returncode
        self.stdout = BrokenPipe(stdout, self)

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


def fake_popen(output=b"", error=b"", returncode=0):
    """Return a `subprocess.Popen` stand-in that writes `error` where told to.

    The real command writes its diagnostics into whatever file object it is
    handed, so the stand-in does the same rather than expose one of its own.
    """

    def run(_args, stdout=None, stderr=None):  # pylint: disable=unused-argument
        stderr.write(error)
        return FakeProcess(stdout=output, returncode=returncode)

    return run


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

    def test_ctr_reports_a_missing_binary(self):
        """
        Tests that an absent `ctr` is reported, not raised raw

        The state only converts `CommandExecutionError`, so a bare
        `FileNotFoundError` would reach the operator as a traceback.
        """
        with patch("subprocess.Popen", side_effect=FileNotFoundError("ctr")):
            with self.assertRaisesRegex(CommandExecutionError, "could not be run"):
                with metalk8s_image_cache._ctr(  # pylint: disable=protected-access
                    ["content", "fetch-object", "registry.invalid/image:1.0", "1.0"]
                ):
                    pass

    @parameterized.expand(
        [
            ("not_json", b"{", "is not valid JSON"),
            ("no_layers", b'{"schemaVersion": 2}', "no list of layers"),
            (
                "two_layers",
                b'{"layers": [{"digest": "sha256:a"}, {"digest": "sha256:b"}]}',
                "exactly one layer",
            ),
            ("no_digest", b'{"layers": [{}]}', "its layer has no digest"),
        ]
    )
    def test_layer_digest_broken_manifest(self, _name, blob, message):
        """
        Tests that `_layer_digest` refuses a manifest it cannot read
        """
        self.assertRaisesRegex(
            CommandExecutionError,
            message,
            metalk8s_image_cache._layer_digest,  # pylint: disable=protected-access
            blob,
            "registry.invalid/image:1.0",
        )

    def test_layer_digest(self):
        """
        Tests that `_layer_digest` reads the digest of the single layer
        """
        digest = "sha256:" + "a" * 64

        self.assertEqual(
            metalk8s_image_cache._layer_digest(  # pylint: disable=protected-access
                registry_manifest(digest), "registry.invalid/image:1.0"
            ),
            digest,
        )

    def test_ctr_streams_the_output_of_the_command(self):
        """
        Tests that `_ctr` runs `ctr` with the arguments it was given
        """
        with patch(
            "subprocess.Popen", side_effect=fake_popen(output=b"payload")
        ) as popen:
            with metalk8s_image_cache._ctr(  # pylint: disable=protected-access
                ["content", "fetch-object", "registry.invalid/image:1.0", "1.0"]
            ) as stream:
                self.assertEqual(stream.read(), b"payload")

        self.assertEqual(
            popen.call_args.args[0],
            ["ctr", "content", "fetch-object", "registry.invalid/image:1.0", "1.0"],
        )

    def test_ctr_reports_a_failed_command(self):
        """
        Tests that `_ctr` raises with what the command printed on stderr

        A registry that does not answer has to name the endpoint it tried,
        otherwise a failed join says nothing about what to look at.
        """
        error = (
            b'ctr: failed to do request: Head "http://10.0.0.1:8080/v2/": '
            b"dial tcp 10.0.0.1:8080: connect: connection refused"
        )

        with patch(
            "subprocess.Popen", side_effect=fake_popen(error=error, returncode=1)
        ):
            with self.assertRaisesRegex(CommandExecutionError, "connection refused"):
                with metalk8s_image_cache._ctr(  # pylint: disable=protected-access
                    ["content", "fetch-blob", "registry.invalid/image:1.0", "sha256:x"]
                ) as stream:
                    stream.read()

    def test_ctr_reports_the_body_error_when_the_early_close_killed_it(self):
        """
        Tests that the SIGPIPE we cause does not bury the real error

        Giving up mid blob closes the pipe, so `ctr` dies of SIGPIPE and
        reports a negative code. That code is our own doing. Reporting it
        instead of what the body raised hides the real fault, which is the
        archive the extraction refused or the disk that filled up.
        """
        with patch("subprocess.Popen", side_effect=fake_popen(output=b"x" * 4096)):
            with self.assertRaisesRegex(ValueError, "refused the payload"):
                with metalk8s_image_cache._ctr(  # pylint: disable=protected-access
                    ["content", "fetch-blob", "registry.invalid/image:1.0", "sha256:x"]
                ) as stream:
                    stream.read(16)
                    raise ValueError("refused the payload")

    def test_ctr_reports_the_command_failure_over_a_body_error(self):
        """
        Tests that a failing `ctr` is reported even when the body raised first

        This is the shape of the most common failure: the registry does not
        answer, `ctr` exits non-zero having written nothing to stdout, and the
        manifest parser raises on the empty stream before the exit code is
        ever looked at. Reported that way, the cause is lost and the operator
        reads a JSON error about a registry that is simply unreachable.
        """
        error = (
            b'ctr: failed to do request: Head "http://10.0.0.1:8080/v2/": '
            b"dial tcp 10.0.0.1:8080: connect: connection refused"
        )

        with patch(
            "subprocess.Popen", side_effect=fake_popen(error=error, returncode=1)
        ):
            with self.assertRaisesRegex(CommandExecutionError, "connection refused"):
                with metalk8s_image_cache._ctr(  # pylint: disable=protected-access
                    ["content", "fetch-object", "registry.invalid/image:1.0", "1.0"]
                ) as stream:
                    raise ValueError(f"nothing to parse in {stream.read()!r}")

    def test_ctr_lets_a_body_error_through_when_the_command_succeeded(self):
        """
        Tests that holding the body error does not swallow it

        A command that exits zero having served a blob the caller cannot read
        means the fault is in the payload, so that error is the one to report.
        """
        with patch("subprocess.Popen", side_effect=fake_popen(output=b"payload")):
            with self.assertRaisesRegex(ValueError, "unreadable payload"):
                with metalk8s_image_cache._ctr(  # pylint: disable=protected-access
                    ["content", "fetch-blob", "registry.invalid/image:1.0", "sha256:x"]
                ) as stream:
                    raise ValueError(f"unreadable payload: {stream.read()!r}")

    def test_ctr_does_not_read_stderr_from_a_pipe(self):
        """
        Tests that the diagnostics of `ctr` go to a file, not a pipe

        They are only read once the blob has been consumed. On a pipe, a
        command verbose enough to fill the buffer would block writing while
        this blocks reading, and the join would hang rather than fail.
        """
        with patch("subprocess.Popen", side_effect=fake_popen()) as popen:
            with metalk8s_image_cache._ctr(  # pylint: disable=protected-access
                ["content", "fetch-object", "registry.invalid/image:1.0", "1.0"]
            ) as stream:
                stream.read()

        self.assertNotEqual(popen.call_args.kwargs["stderr"], subprocess.PIPE)

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
