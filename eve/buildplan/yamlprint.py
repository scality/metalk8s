"""Customized `yaml.dump` for our needs."""

import collections

import yaml


class CustomDumper(yaml.SafeDumper):
    """Attach custom representers to this dumper class."""


CustomDumper.add_representer(
    collections.OrderedDict,
    lambda dumper, val: dumper.represent_dict(val.items()),
)


def dump(data, stream=None, Dumper=CustomDumper, **kwargs):
    return yaml.dump(data, stream=stream, Dumper=Dumper, **kwargs)
