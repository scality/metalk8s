# coding: utf-8


"""The build chain module.

It defines tasks and helper for the build system.
"""


from pathlib import Path


# Root of the repository.
ROOT: Path = Path(__file__).resolve().parent.parent
