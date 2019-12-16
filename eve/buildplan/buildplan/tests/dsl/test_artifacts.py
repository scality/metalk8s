from collections import OrderedDict

import pytest

from buildplan.dsl import artifacts


class TestCopyArtifacts:
    @pytest.mark.parametrize(
        "sources,destination,expected",
        (
            (
                ["somefile", "someother"],
                None,
                {
                    "name": "Copy artifacts",
                    "command": (
                        "mkdir -p artifacts; "
                        "for artifact in somefile someother; "
                        'do cp -r "$artifact" artifacts; done'
                    ),
                },
            ),
            (
                ["somefile", "somedir/*"],
                "prefix",
                {
                    "name": "Copy artifacts for 'prefix'",
                    "command": (
                        "mkdir -p artifacts/prefix; "
                        "for artifact in somefile somedir/*; "
                        'do cp -r "$artifact" artifacts/prefix; done'
                    ),
                },
            ),
        ),
    )
    def test_dump(self, sources, destination, expected):
        step = artifacts.CopyArtifacts(sources, destination=destination)
        expected_body = OrderedDict(
            [("name", expected["name"]), ("command", expected["command"],),]
        )

        assert step.dump()["ShellCommand"] == expected_body


@pytest.mark.parametrize(
    "sources,expected",
    (
        (["some", "other"], [artifacts.CopyArtifacts(["some", "other"])]),
        (
            {"prefix": ["somefile"], "otherprefix": ["otherfile"]},
            [
                artifacts.CopyArtifacts(["somefile"], destination="prefix"),
                artifacts.CopyArtifacts(["otherfile"], destination="otherprefix"),
            ],
        ),
    ),
)
def test_copy_artifacts(sources, expected):
    steps = list(artifacts.copy_artifacts(sources))
    assert len(steps) == len(expected)

    for left, right in zip(steps, expected):
        assert left.dump() == right.dump()
