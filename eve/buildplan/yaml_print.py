import collections
import pathlib

import yaml


class CustomDumper(yaml.SafeDumper):
    """Attach custom representers to this dumper class."""


def path_representer(dumper, path):
    return dumper.represent_str(str(path))


CustomDumper.add_representer(pathlib.Path, path_representer)
CustomDumper.add_representer(pathlib.PosixPath, path_representer)
CustomDumper.add_representer(
    collections.OrderedDict,
    lambda dumper, val: dumper.represent_dict(val.items()),
)


def dump(data, stream=None, Dumper=CustomDumper, **kwargs):
    return yaml.dump(data, stream=stream, Dumper=Dumper, **kwargs)
