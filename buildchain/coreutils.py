# coding: utf-8


"""Pure Python implementation of some coreutils."""


import functools
import hashlib
from pathlib import Path
from typing import Sequence


# Buffer size (8 Mio).
BUFSIZE : int = 8 * (1024 * 1024)


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
        with filepath.open('rb', buffering=BUFSIZE) as fp:
            for chunk in iter(functools.partial(fp.read, BUFSIZE), b''):
                hasher.update(chunk)
        digests.append(hasher.hexdigest())
    with output_file.open('w', encoding='utf-8') as fp:
        for filepath, digest in zip(input_files, digests):
            fp.write('{}  {}\n'.format(digest, filepath.name))
