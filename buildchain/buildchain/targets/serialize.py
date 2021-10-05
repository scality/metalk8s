# coding: utf-8

"""Targets to write files from Python objects."""

import base64
import collections
import enum
import json
from pathlib import Path
from typing import Any, Callable, Dict, IO, Mapping, Sequence

import yaml

from buildchain import constants
from buildchain import types
from buildchain import utils

from . import base


def render_json(obj: Any, filepath: Path) -> None:
    """Serialize an object as JSON to a given file path."""
    with filepath.open("w", encoding="utf-8") as file_obj:
        json.dump(obj, file_obj, sort_keys=True, indent=2)


def render_envfile(variables: Mapping[str, str], filepath: Path) -> None:
    """Serialize a dict as an env file to the given file path."""
    with filepath.open("w", encoding="utf-8") as fp:
        data = "\n".join("{}={}".format(key, value) for key, value in variables.items())
        fp.write(data)
        fp.write("\n")


def render_yaml(data: Sequence[Any], filepath: Path) -> None:
    """Serialize an object as YAML to a given file path."""
    with filepath.open("w", encoding="utf-8") as fp:
        _yaml_dump(data, fp)


def render_sls(sls: "SaltState", filepath: Path) -> None:
    """Serialize a Salt state to a given file path."""
    with filepath.open("w", encoding="utf-8") as fp:
        if sls.shebang:
            fp.write(sls.shebang)
            fp.write("\n" * 2)
        if sls.imports:
            fp.write("\n".join(sls.imports))
            fp.write("\n" * 2)
        _yaml_dump(sls.content, fp)


class Renderer(enum.Enum):
    """Supported rendering methods for `SerializedData` targets."""

    JSON = "JSON"
    ENV = "ENV"
    SLS = "SLS"
    YAML = "YAML"


class SerializedData(base.AtomicTarget):
    """Serialize an object into a file with a specific renderer."""

    RENDERERS: Dict[Renderer, Callable[[Any, Path], None]] = {
        Renderer.JSON: render_json,
        Renderer.ENV: render_envfile,
        Renderer.YAML: render_yaml,
        Renderer.SLS: render_sls,
    }

    def __init__(
        self,
        data: Any,
        destination: Path,
        renderer: Renderer = Renderer.JSON,
        **kwargs: Any
    ):
        """Configure a file rendering task.

        Arguments:
            data:        object to render into a file
            destination: path to the rendered file

        Keyword Arguments:
            They are passed to `Target` init method
        """
        kwargs["targets"] = [destination]
        super().__init__(**kwargs)

        self._data = data
        self._dest = destination

        if not isinstance(renderer, Renderer):
            raise ValueError(
                "Invalid `renderer`: {!r}. Must be one of: {}".format(
                    renderer, ", ".join(map(repr, Renderer))
                )
            )

        self._renderer = renderer

    @property
    def task(self) -> types.TaskDict:
        task = self.basic_task
        task.update(
            {
                "title": utils.title_with_target1(
                    "RENDER {}".format(self._renderer.value)
                ),
                "doc": 'Render file "{}" with "{}"'.format(
                    self._dest.relative_to(constants.ROOT), self._renderer
                ),
                "actions": [self._run],
            }
        )
        return task

    @property
    def _render(self) -> Callable[[Any, Path], None]:
        return self.RENDERERS[self._renderer]

    def _run(self) -> None:
        """Render the file."""
        self._render(self._data, self._dest)


# YAML {{{


class YAMLDocument:
    """A YAML document, with an optional preamble (like a shebang)."""

    class Literal(str):
        """A large block of text, to be rendered as a block scalar."""

    class ByteString(bytes):
        """A binary string, to be rendered as a base64-encoded literal."""

    @classmethod
    def text(cls, value: str) -> "YAMLDocument.Literal":
        """Cast the value to a Literal."""
        return cls.Literal(value)

    @classmethod
    def bytestring(cls, value: bytes) -> "YAMLDocument.ByteString":
        """Cast the value to a ByteString."""
        return cls.ByteString(value)


SaltState = collections.namedtuple("SaltState", ["content", "shebang", "imports"])


def _literal_representer(dumper: yaml.BaseDumper, data: Any) -> Any:
    scalar = yaml.dumper.SafeDumper.represent_str(dumper, data)  # type: ignore
    scalar.style = "|"
    return scalar


def _bytestring_representer(dumper: yaml.BaseDumper, data: Any) -> Any:
    return _literal_representer(dumper, base64.encodebytes(data).decode("utf-8"))


def _yaml_dump(data: Sequence[Any], fp: IO[Any]) -> None:
    dumper = yaml.SafeDumper(fp, sort_keys=False)
    dumper.add_representer(YAMLDocument.Literal, _literal_representer)  # type: ignore
    dumper.add_representer(
        YAMLDocument.ByteString, _bytestring_representer  # type: ignore
    )
    try:
        dumper.open()  # type: ignore
        for document in data:
            dumper.represent(document)
        dumper.close()  # type: ignore
    finally:
        dumper.dispose()  # type: ignore


# }}}
