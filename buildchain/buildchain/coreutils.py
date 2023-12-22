# coding: utf-8


"""Pure Python implementation of some core utilities."""


import gzip as gzip_module
import functools
import hashlib
import os
import shutil
from pathlib import Path
from typing import Iterator, Sequence


# Buffer size (8 Mio).
BUFSIZE: int = 8 * (1024 * 1024)


def sha256sum(input_files: Sequence[Path], output_file: Path) -> None:
    """Compute the SHA256 digest of files.

    The digests are written into an output file, respecting the sha256sum format
    (i.e. each line contains a digest followed by two spaces and then the
    filename).

    Arguments:
        input_files: path to the files to hash
        output_file: path to the file that will contain the checksums
    """
    digests = []
    for filepath in input_files:
        hasher = hashlib.sha256()
        with filepath.open("rb", buffering=BUFSIZE) as fp_in:
            for chunk in iter(functools.partial(fp_in.read, BUFSIZE), b""):
                hasher.update(chunk)
        digests.append(hasher.hexdigest())
    with output_file.open("w", encoding="utf-8") as fp_out:
        for filepath, digest in zip(input_files, digests):
            fp_out.write(f"{digest}  {filepath.name}\n")


def gzip(input_file: Path, keep_input: bool = False, level: int = 6) -> None:
    """Compress the input file using LZ77 coding.

    Arguments:
        input_file: path to the file to compress
        keep_input: if False, the original file is deleted after compression
        level:      compression level
    """
    filename = input_file.with_suffix(input_file.suffix + ".gz")
    with input_file.open("rb", buffering=BUFSIZE) as fp:
        with gzip_module.open(filename, "wb", compresslevel=level) as out:
            for chunk in iter(functools.partial(fp.read, BUFSIZE), b""):
                out.write(chunk)
    if not keep_input:
        os.unlink(input_file)


def cp_file(source: Path, destination: Path) -> None:
    """Copy the source file to the destination, preserving metadata.

    Symbolic link are copied as symbolic link (i.e. they're not resolved).

    Arguments:
        source: path to the file to copy
        destination: path to the copy
    """
    shutil.copy2(source, destination, follow_symlinks=False)


def rm_rf(directory: Path) -> None:
    """Remove directory and its contents recursively.

    Ignore errors (e.g. ignore nonexistent files).

    Arguments:
        directory: path to the directory to delete
    """
    shutil.rmtree(directory, ignore_errors=True)


def touch(path: Path) -> None:
    """Create a file at the given path.

    Arguments:
        path: path to the file to create
    """
    path.touch()


def ls_files_rec(root: Path) -> Iterator[Path]:
    """List recursively all the files under the specified `root` directory.

    Arguments:
        path: path to the root directory

    Returns:
        an iterator over the file paths
    """
    return (path for path in root.rglob("*") if path.is_file())
