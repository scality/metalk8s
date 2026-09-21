"""
Provision the local container image cache from a boot cache image.

A boot cache image is a carrier and nothing else: built ``FROM scratch`` with a
single ``COPY``, it holds one archive per container image a node of its role
needs in order to boot. Either way in, the archives are read out of it without
ever importing the carrier into containerd.

That choice is about what the alternative leaves behind. Importing writes the
blob in the content store and the layer in the snapshotter, roughly twice its
size, and ``ctr images rm`` reclaims neither: containerd's garbage collector
does, whenever it runs. Since the carrier is packaging and not payload, what it
leaves is a third copy of bytes nothing can use.

Two sources, because a node has one or the other and never both.
:func:`provision` reads the docker archive shipped on the ISO, which only the
bootstrap node mounts. :func:`provision_from_image` pulls the blob the registry
serves, for a node joining a cluster that already runs.

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


def _temporary_name(name):
    """Return the name an archive is written under before it is published."""
    return f".{name}.tmp"


def _accept(member, source):
    """Return the name a layer member takes in the cache, or refuse it.

    Shared by both provisioning paths so that the cold one cannot end up
    accepting what the hot one refuses, and so that the messages an operator
    reads are the same wherever the image came from.
    """
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
    # `.etcd.tar.tmp` is where `etcd.tar` is written before it is published,
    # so a layer carrying both names them two distinct targets, the duplicate
    # guard stays silent, and one archive ends up holding the other's bytes.
    if name == _temporary_name(name.removeprefix(".").removesuffix(".tmp")):
        raise CommandExecutionError(
            f'Boot cache image "{source}" carries "{name}", a reserved name'
        )

    return name


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
        name = _accept(member, source)
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
    tmp = os.path.join(directory, _temporary_name(name))
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


def _layer_digest(blob, image):
    """Return the digest of the single layer the image manifest announces.

    A registry serves its own schema, a mapping with a ``layers`` list, not the
    ``manifest.json`` of a docker archive that :func:`provision` reads.
    """
    try:
        manifest = json.loads(blob)
    except ValueError as exc:
        raise CommandExecutionError(
            f'The manifest of "{image}" is not valid JSON: {exc}'
        ) from exc

    try:
        layers = manifest["layers"]
        count = len(layers)
    except (KeyError, TypeError) as exc:
        raise CommandExecutionError(
            f'Unexpected manifest for "{image}": no list of layers'
        ) from exc

    # One image, one layer, same guard as the cold path: anything else means
    # this is no longer the flat carrier this module knows how to read.
    if count != 1:
        raise CommandExecutionError(
            f'Boot cache image "{image}" must carry exactly one layer, found {count}'
        )

    try:
        return layers[0]["digest"]
    except (KeyError, TypeError) as exc:
        raise CommandExecutionError(
            f'Unexpected manifest for "{image}": its layer has no digest'
        ) from exc


def _settled(marker, dest, image):
    """Return what the marker records when the cache already holds this image.

    Both halves matter. The reference says the cache was filled from what is
    being asked for now, and it carries the version, so an upgrade does not
    match. The archive names say the cache still holds it: a marker on its own
    would report an emptied directory as provisioned, and the state gates the
    kubelet on that answer.

    Answered from disk alone, deliberately. This runs on every highstate and
    not only at join, so reaching the registry to conclude there is nothing to
    do would make the kubelet a permanent dependent of a registry served by
    pods that need kubelets.
    """
    try:
        with salt.utils.files.fopen(marker, "r") as recorded:
            state = json.load(recorded)
    except (OSError, ValueError):
        return None

    if not isinstance(state, dict) or state.get("image") != image:
        return None

    archives = state.get("archives") or []
    if not archives:
        return None

    if not all(os.path.isfile(os.path.join(dest, name)) for name in archives):
        return None

    # The record itself, and not the digest it holds: a marker written by an
    # older format, or repaired by hand, records no digest and would then read
    # as an unfilled cache, costing a gigabyte to reach the state already on
    # disk while the gate holds the kubelet back.
    return state


def _record(marker, image, digest, archives):
    """Record what was extracted, so the next run can settle without a pull."""
    directory, name = os.path.split(marker)
    tmp = os.path.join(directory, _temporary_name(name))
    try:
        with salt.utils.files.fopen(tmp, "w") as out:
            json.dump({"image": image, "digest": digest, "archives": archives}, out)
            out.flush()
            os.fsync(out.fileno())
        # Written beside and renamed, like every archive it records: truncating
        # in place turns a crash mid-write into a marker that parses as
        # nothing, and the next run then refetches the whole blob to reach the
        # state the node already holds.
        os.replace(tmp, marker)
    except OSError as exc:
        with contextlib.suppress(OSError):
            os.remove(tmp)
        # The archives are already published, so this is not a failed
        # provisioning. Left raw it would surface as a traceback, and the next
        # run would fetch the whole blob again to reach the same state.
        raise CommandExecutionError(
            f'Extracted "{image}" but failed to record it in "{marker}": {exc}'
        ) from exc


def provision_from_image(image, dest, marker, hosts_dir=None, dry_run=False):
    """
    Extract the image archives a boot cache image carries, pulled from a registry.

    This is the hot path: the cluster runs, so the image comes from the registry
    rather than the ISO, which a joining node never mounts.

    The blob is read as a stream, since a registry serves it gzipped and seeking
    backwards in it would mean decompressing from the start. Nothing is written
    under its final name until every header has been accepted, so an image this
    module refuses leaves the cache as it found it.

    image
        Reference of the boot cache image in the registry
    dest
        Path of the cache directory the archives are extracted into
    marker
        Path of the JSON file recording what was extracted: the image
        reference, the layer digest and the archive names
    hosts_dir : None
        Directory holding the registry host configuration, since :command:`ctr`
        does not read the one containerd itself uses. The scheme comes from the
        host entry there, so reaching a registry served in the clear needs no
        flag of its own.
    dry_run : False
        Report whether the cache is stale without reaching the registry at
        all. Both the digest and the archive names are answered as ``None``
        rather than guessed, since neither is known without asking.
    """
    # The object to resolve is the tag, and it is only a tag if the last path
    # segment carries one. A reference such as `10.0.0.1:5000/foo` would
    # otherwise hand `5000/foo` to the command, and one pinned by digest,
    # `foo@sha256:<hex>`, would hand over the bare hex.
    reference = image.rsplit("/", 1)[-1]
    if "@" in reference or ":" not in reference:
        raise CommandExecutionError(f'Boot cache image "{image}" carries no tag')

    settled = _settled(marker, dest, image)
    if settled is not None:
        log.info('Cache "%s" already holds the archives of "%s"', dest, image)
        return {"extracted": [], "digest": settled.get("digest")}

    if dry_run:
        # `test=True` must change nothing, and a registry call is not nothing:
        # it fails when the registry is down, which is the very state an
        # operator runs `test=True` to look into. The cold path refuses the
        # same way, see `provision`.
        return {"extracted": None, "digest": None}

    # Checked before the fetch, since the blob is about a gigabyte and the
    # first write only happens once it is all read. After the dry run returns,
    # though: the state that creates this directory changes nothing under
    # `test=True`, so demanding it earlier would fail every dry run on a fresh
    # node. The cold path splits it the same way, see `provision`.
    if not os.path.isdir(dest):
        raise CommandExecutionError(f'Cache directory "{dest}" is not a directory')

    options = ["--hosts-dir", hosts_dir] if hosts_dir else []

    tag = image.rsplit("/", 1)[-1].rsplit(":", 1)[-1]
    with _ctr(["content", "fetch-object"] + options + [image, tag]) as stream:
        digest = _layer_digest(stream.read(), image)

    with _ctr(["content", "fetch-blob"] + options + [image, digest]) as stream:
        try:
            with tarfile.open(fileobj=stream, mode="r|*") as layer:
                extracted = _extract(layer, dest, image)
        except tarfile.TarError as exc:
            # A blob the registry truncated, or an error page a proxy served
            # in its place. Raw, it reaches the state as a traceback, since a
            # state only converts `CommandExecutionError`.
            raise CommandExecutionError(
                f'The layer of "{image}" is not a readable archive: {exc}'
            ) from exc

    _record(marker, image, digest, extracted)

    log.info('Provisioned "%s" from "%s": %d extracted', dest, image, len(extracted))

    return {"extracted": extracted, "digest": digest}


def _extract(layer, dest, image):
    """Write every archive the layer carries, publishing them only at the end.

    The cache directory is read by a systemd timer that may fire at any moment,
    and the preload script globs it whatever the state reported. So a refused
    image must leave no name behind, which a stream cannot promise by checking
    the headers first: nothing is written under a final name until every
    header has been accepted and every archive is on disk.

    The publication itself is a loop and not one atomic act, since renaming
    several files cannot be. A failure part way through leaves the cache
    holding a prefix, which is survivable: the caller records nothing, so the
    state fails, the gate keeps the kubelet back, and the next run redoes the
    extraction whole.
    """
    pending = {}
    published = []

    try:
        for member in layer:
            if member.isdir():
                continue
            name = _accept(member, image)
            target = os.path.join(dest, name)
            if target in pending:
                raise CommandExecutionError(
                    f'Boot cache image "{image}" carries "{name}" twice'
                )
            pending[target] = _write_temp(layer, member, target)

        # An empty cache reported as provisioned would release the kubelet on
        # a node whose images are nowhere to be found.
        if not pending:
            raise CommandExecutionError(
                f'Boot cache image "{image}" carries no archive'
            )

        for target, tmp in sorted(pending.items()):
            try:
                os.replace(tmp, target)
            except OSError as exc:
                # What already landed is carried out with the error: the
                # preload timer will import that prefix whatever the state
                # reported, so an operator told nothing changed would look
                # for the trouble in the wrong place.
                failure = CommandExecutionError(
                    f'Failed to publish "{target}" into the cache: {exc}'
                )
                failure.published = published
                raise failure from exc
            published.append(os.path.basename(target))
    except Exception:
        for tmp in pending.values():
            with contextlib.suppress(OSError):
                os.remove(tmp)
        raise

    return sorted(os.path.basename(target) for target in pending)


def _write_temp(layer, member, target):
    """Write one archive beside its final name, and return the temporary path."""
    directory, name = os.path.split(target)
    tmp = os.path.join(directory, _temporary_name(name))
    try:
        with salt.utils.files.fopen(tmp, "wb") as out:
            shutil.copyfileobj(layer.extractfile(member), out)
            out.flush()
            os.fsync(out.fileno())
    except Exception as exc:
        # Whatever went wrong, and not only a filesystem error: a stream cut
        # mid-copy raises from `tarfile`. The batch cleanup only knows the
        # archives already written, and this one is not among them yet, so
        # nothing else would ever remove it.
        with contextlib.suppress(OSError):
            os.remove(tmp)
        if isinstance(exc, OSError):
            raise CommandExecutionError(f'Failed to write "{target}": {exc}') from exc
        raise

    return tmp


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
