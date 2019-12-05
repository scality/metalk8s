from collections import OrderedDict

from buildplan import yamlprint


def test_dump_ordered_dict():
    dataset = OrderedDict([("key1", "value1"), ("key2", "value2"),])

    assert yamlprint.dump(dataset) == "key1: value1\nkey2: value2\n"
