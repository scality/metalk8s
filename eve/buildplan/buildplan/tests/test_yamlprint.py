from pathlib import Path
from collections import OrderedDict

from buildplan import yamlprint


def test_dump_ordered_dict():
    dataset = OrderedDict([("key1", "value1"), ("key2", "value2"),])

    assert yamlprint.dump(dataset) == "key1: value1\nkey2: value2\n"


def test_dump_path():
    path = Path("somewhere") / "over" / "the_rainbow"
    assert (
        yamlprint.dump({"path": path}) == "path: somewhere/over/the_rainbow\n"
    )
