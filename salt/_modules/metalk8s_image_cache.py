"""
Provision the local container image cache from a boot cache image.

A boot cache image is a carrier and nothing else: built ``FROM scratch`` with a
single ``COPY``, it holds one archive per container image a node of its role
needs in order to boot. Here we read those archives straight out of the docker
archive shipped on the ISO, instead of importing the boot cache image into
containerd and mounting it.

That choice is about what the alternative leaves behind. The archive on the ISO
is uncompressed, so importing it writes its blob in the content store and its
layer in the snapshotter, roughly twice its size, and ``ctr images rm`` reclaims
neither: containerd's garbage collector does, whenever it runs. Reading the
archive costs a single pass and leaves nothing.

The archives land flat in the cache directory. That is the layout
``containerd-image-preload`` imports from, and the one the image cache agent
leaves alone: the agent owns the per-resource subdirectories, marked with a
sentinel, and its garbage collection spares flat files.
"""

import contextlib
import json
import logging
import os
import shutil
import subprocess
import tarfile
import tempfile

import salt.utils.files
from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s_image_cache"


def __virtual__():
    """Load the module under its short name."""
    return __virtualname__


def _layer_name(archive, source):
    """Return the name of the single layer held by a docker archive.

    One image, one layer. Anything else means this is no longer the flat
    carrier this module knows how to read, so refuse it rather than extract
    part of it and report a full cache.
    """
    try:
        manifest_file = archive.extractfile("manifest.json")
    except KeyError as exc:
        raise CommandExecutionError(
            f'Boot cache image "{source}" carries no manifest.json'
        ) from exc

    # `extractfile` answers `None`, not a `KeyError`, for a member that is
    # not a regular file.
    if manifest_file is None:
        raise CommandExecutionError(
            f'The manifest.json of "{source}" is not a regular file'
        )

    try:
        manifest = json.load(manifest_file)
    except ValueError as exc:
        raise CommandExecutionError(
            f'The manifest.json of "{source}" is not valid JSON: {exc}'
        ) from exc

    try:
        images = len(manifest)
        layers = manifest[0]["Layers"]
        count = len(layers)
    except (IndexError, KeyError, TypeError) as exc:
        raise CommandExecutionError(
            f'Unexpected manifest.json in "{source}": no list of layers'
        ) from exc

    if images != 1:
        raise CommandExecutionError(
            f'Boot cache image "{source}" must carry exactly one image, '
            f"found {images}"
        )

    if count != 1:
        raise CommandExecutionError(
            f'Boot cache image "{source}" must carry exactly one layer, '
            f"found {count}"
        )

    return layers[0]


def _archives(layer, source):
    """Map each archive the layer carries to the name it takes in the cache.

    The headers are walked before anything is written, so an image this
    module refuses is refused whole. The layer is opened for random access,
    which makes this pass seek over the payload rather than read it.
    """
    members = {}

    for member in layer:
        if member.isdir():
            continue
        # A hard link or a symlink would be dropped without a word, and the
        # cache would look provisioned while an image the kubelet needs is
        # missing.
        if not member.isfile():
            raise CommandExecutionError(
                f'Boot cache image "{source}" carries "{member.name}", '
                "which is not a regular file"
            )
        # Base names only, since everything lands flat: two members
        # differing by directory would overwrite each other.
        name = os.path.basename(member.name)
        if not name:
            raise CommandExecutionError(
                f'Boot cache image "{source}" carries "{member.name}", '
                "which has no file name"
            )
        if name in members:
            raise CommandExecutionError(
                f'Boot cache image "{source}" carries "{name}" twice'
            )
        members[name] = member

    if not members:
        raise CommandExecutionError(f'Boot cache image "{source}" carries no archive')

    return members


def _write(layer, member, target):
    """Write one archive out of the layer, atomically and durably.

    Two things matter here. The cache directory is read by a systemd timer
    that may fire at any moment, so nothing partial may ever appear under the
    final name. And the node this runs on is being installed, so the content
    has to reach the disk before the name does, or a crash would publish an
    archive whose bytes never made it.
    """
    directory, name = os.path.split(target)
    tmp = os.path.join(directory, f".{name}.tmp")
    try:
        with salt.utils.files.fopen(tmp, "wb") as out:
            shutil.copyfileobj(layer.extractfile(member), out)
            out.flush()
            os.fsync(out.fileno())
        os.replace(tmp, target)
    except OSError as exc:
        raise CommandExecutionError(f'Failed to write "{target}": {exc}') from exc
    finally:
        # Gone already on the happy path, since the rename took it. A failure
        # to clean up must not replace the error being raised.
        with contextlib.suppress(OSError):
            os.remove(tmp)


@contextlib.contextmanager
def _ctr(args):
    """Run a :command:`ctr` command, yielding its standard output as a stream.

    The blob of a boot cache image weighs about a gigabyte, so it is read as it
    arrives rather than captured: nothing here ever holds the whole payload.
    """
    # A file and not a pipe: the diagnostics are only read once the blob has
    # been consumed, and a pipe whose buffer filled would block the command
    # writing it while this blocks reading the blob.
    with tempfile.TemporaryFile() as diagnostics:
        failure = None

        try:
            started = subprocess.Popen(  # pylint: disable=consider-using-with
                ["ctr"] + args, stdout=subprocess.PIPE, stderr=diagnostics
            )
        except OSError as exc:
            # A state only converts `CommandExecutionError`, so a bare `OSError`
            # here would reach the operator as a traceback.
            raise CommandExecutionError(
                f"`ctr {' '.join(args)}` could not be run: {exc}"
            ) from exc

        with started as process:
            try:
                yield process.stdout
            except Exception as exc:  # pylint: disable=broad-except
                # Held rather than propagated: a command that failed wrote
                # nothing to read, so the caller raising on an empty stream is
                # the symptom. The exit code below says whether it is also the
                # cause, and it is only final once `Popen` has waited.
                failure = exc
            finally:
                process.stdout.close()

        # A negative code means a signal, and the only signal this sends is the
        # `SIGPIPE` of closing the pipe above while the command was still
        # writing. That happens exactly when the body gave up early, so the
        # command died of the failure rather than caused it: reporting the
        # signal here would bury the archive that was refused, or the disk that
        # filled up, under `failed with -13`.
        #
        # This reads the sign because `ctr` is executed directly, so the kernel
        # reports the signal as such. Run it behind a shell, or hand it a
        # version that traps `EPIPE` and exits non-zero, and a broken pipe
        # would come back as a positive code that this no longer recognises.
        if failure is not None and process.returncode < 0:
            raise failure

        if process.returncode != 0:
            diagnostics.seek(0)
            error = diagnostics.read().decode(errors="replace").strip()
            raise CommandExecutionError(
                f"`ctr {' '.join(args)}` failed with {process.returncode}: {error}"
            ) from failure

        if failure is not None:
            raise failure


def provision(source, dest, dry_run=False):
    """
    Extract the image archives carried by a boot cache image into the cache.

    Returns the archive names, sorted, split between those written and those
    already in place. An archive whose size already matches the one announced
    by the image is left alone, so a second run changes nothing.

    source
        Path of the boot cache image, as a docker archive
    dest
        Path of the cache directory the archives are extracted into
    dry_run : False
        Report what would be written without writing anything

    CLI Example:

    .. code-block:: bash

        salt-call metalk8s_image_cache.provision \
            /srv/scality/metalk8s-124.0.0/images/boot-cache.tar \
            /var/lib/image-cache
    """
    if not os.path.isfile(source):
        raise CommandExecutionError(f'Boot cache image "{source}" is not a file')
    # A dry run reports what a real run would write, and a real run is
    # ordered after the state that creates the directory. Demanding it here
    # would turn `test=True` on a fresh node into a failure.
    if not dry_run and not os.path.isdir(dest):
        raise CommandExecutionError(f'Cache directory "{dest}" is not a directory')

    extracted = []
    present = []

    try:
        with tarfile.open(source) as archive:
            name = _layer_name(archive, source)
            try:
                stream = archive.extractfile(name)
            except KeyError as exc:
                raise CommandExecutionError(
                    f'Boot cache image "{source}" does not carry its layer "{name}"'
                ) from exc

            if stream is None:
                raise CommandExecutionError(
                    f'The layer "{name}" of "{source}" is not a regular file'
                )

            # Random access, not a stream: walking the headers then seeks over
            # the payload. In stream mode, skipping an archive already in the
            # cache would mean reading it off the ISO to throw it away.
            with tarfile.open(fileobj=stream, mode="r") as layer:
                for archive_name, member in sorted(_archives(layer, source).items()):
                    target = os.path.join(dest, archive_name)
                    if (
                        os.path.isfile(target)
                        and os.path.getsize(target) == member.size
                    ):
                        present.append(archive_name)
                        continue

                    if not dry_run:
                        _write(layer, member, target)
                    extracted.append(archive_name)
    except tarfile.TarError as exc:
        raise CommandExecutionError(
            f'Boot cache image "{source}" is not a readable archive: {exc}'
        ) from exc

    log.info(
        'Provisioned "%s" from "%s": %d extracted, %d already present',
        dest,
        source,
        len(extracted),
        len(present),
    )

    return {"extracted": extracted, "present": present}
