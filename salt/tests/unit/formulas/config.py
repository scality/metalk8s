"""Expose configuration options to define test cases for rendering formulas.

Options are read from a configuration file, following this format:
- a root-level "default_case" key defines the options to use in the default test case
- other keys define directories and/or file names for which to override the default
  options (higher specificity takes precedence, see the `get_cases` method)
- outside of the "default_case" key, custom test cases are specified by the "_cases" key
- test cases are defined as a map of <test case ID> to a "<name>: <value>" map of
  options
- the special key "_skip" can be used to omit rendering of a specific directory or file
  (uses a Boolean value, defaults to False)
"""

import copy
from pathlib import Path
from typing import (
    Any,
    Dict,
    FrozenSet,
    Iterator,
    List,
    NamedTuple,
    Optional,
    Tuple,
    Type,
)

import pytest
import yaml
import salt.utils.dictupdate  # type: ignore

from tests.unit.formulas import paths

CONFIG_FILE = paths.BASE_DIR / "config.yaml"

with CONFIG_FILE.open("r") as config_file:
    TESTS_CONFIG = yaml.safe_load(config_file)


DEFAULT_CASE = TESTS_CONFIG["default_case"]


# pylint: disable=too-few-public-methods
class BaseOption:
    """Base-class for registering "option kinds"."""

    def __init__(self, value: Any):
        self.value = value

    def __repr__(self) -> str:
        return f"{self.__class__.__qualname__}: {self.value}"

    def update_context(self, context: Dict[str, Any]) -> None:
        """Update the existing context given the selected value."""


class EnumOption(BaseOption):
    """Base-class for options with an enumeration of allowed values."""

    ALLOWED_VALUES: FrozenSet[Any] = frozenset()

    def __init__(self, value: Any):
        assert (
            value in self.ALLOWED_VALUES
        ), f"Value '{value}' is not allowed for option {self.__class__.__qualname__}"
        super().__init__(value)


class DictOption(BaseOption):
    """Base-class for options with arbitrary dictionaries as values.

    Simply adds a runtime check that value is indeed a dictionary.
    """

    def __init__(self, value: Dict[str, Any]):
        assert isinstance(value, dict), (
            f"Value '{value}' is not a dictionary, "
            f"which is invalid for option {self.__class__.__qualname__}"
        )
        super().__init__(value)


class Saltenv(BaseOption):
    """Pick a saltenv to use when rendering.

    Pass the special value "__default__" to use
    "metalk8s-{{ pillar.metalk8s.cluster_version }}".
    """

    def __init__(self, value: str):
        super().__init__(value)
        self.saltenv = None if value == "__default__" else value

    def update_context(self, context: Dict[str, Any]) -> None:
        if self.value == "__default__":
            cluster_version = (
                context["pillar"].get("metalk8s", {}).get("cluster_version", "0.0.0")
            )
            context["saltenv"] = self.saltenv = f"metalk8s-{cluster_version!s}"
        else:
            context["saltenv"] = self.value

    def __repr__(self) -> str:
        saltenv = self.saltenv or "<not-initialized>"
        if self.value == "__default__":
            saltenv += " (default)"
        return f"{self.__class__.__qualname__}: {saltenv}"


class OS(EnumOption):
    """Simulate one of the OS distributions supported by MetalK8s."""

    ALLOWED_VALUES: FrozenSet[str] = frozenset(
        ("CentOS/7", "RedHat/7", "RedHat/8", "Ubuntu/18")
    )

    def update_context(self, context: Dict[str, Any]) -> None:
        os_name, release = self.value.split("/")
        family = "Debian" if os_name == "Ubuntu" else "RedHat"
        grains = context["grains"]
        grains["os"] = os_name
        grains["os_family"] = family
        grains["osmajorrelease"] = release


class MinionMode(EnumOption):
    """Switch between rendering on a plain minion or the master minion."""

    ALLOWED_VALUES: FrozenSet[str] = frozenset(("minion", "master"))

    def update_context(self, context: Dict[str, Any]) -> None:
        assert "opts" in context
        context["opts"]["__role"] = self.value


class MinionState(EnumOption):
    """Choose one of a few predefined minion states.

    Each state will impact values in the context, usually mostly grains and
    pillar.

    Allowed states:
    - "ready" (the default): Use default mocks and grains/pillar data from a
      functional, fully installed minion
    - "new": Clean up the default grains and pillar to simulate a fresh minion
      install
    - "standalone": No ext pillar, local file client
    """

    ALLOWED_VALUES: FrozenSet[str] = frozenset(("ready", "new", "standalone"))

    def update_context(self, context: Dict[str, Any]) -> None:
        if self.value == "ready":
            # Nothing to do
            return

        if self.value == "new":
            context["grains"].pop("metalk8s", None)

        if self.value == "standalone":
            context["pillar"].pop("metalk8s", None)
            context["pillar"].pop("networks", None)

    @property
    def config_overrides(self) -> Dict[str, Any]:
        """Expose overrides for a minion configuration representing this state."""
        if self.value == "standalone":
            return {
                "file_client": "local",
            }

        return {}


class Volumes(EnumOption):
    """Override pillar data for volumes using simple aliases.

    Allowed values:
    - "none" (default): no volume in pillar
    - "errors": some _errors in pillar
    - "bootstrap": pillar.metalk8s.volumes set to None
    - "sparse": some sparse loop volumes
    - "block": some raw block volumes
    - "mix": mix of both volume kinds
    """

    ALLOWED_VALUES: FrozenSet[str] = frozenset(
        ("none", "errors", "bootstrap", "sparse", "block", "mix")
    )

    @staticmethod
    def _generate_volume(name: str, kind: str, node: str) -> Dict[str, Any]:
        volume: Dict[str, Any] = {
            "apiVersion": "storage.metalk8s.scality.com/v1alpha1",
            "kind": "Volume",
            "metadata": {
                "name": name,
                "uid": "abcde-12345",
            },
            "spec": {
                "mode": "Filesystem",
                "nodeName": node,
            },
        }
        if kind == "sparse":
            volume["spec"]["sparseLoopDevice"] = {"size": "20Gi"}
        elif kind == "block":
            volume["spec"]["rawBlockDevice"] = {"devicePath": "/dev/sdb1"}
        return volume

    def update_context(self, context: Dict[str, Any]) -> None:
        volumes: Optional[Dict[str, Any]]
        if self.value == "bootstrap":
            volumes = None
        elif self.value == "errors":
            volumes = {"_errors": ["Some error when retrieving volumes"]}
        else:
            volumes = {}
            node = context["grains"]["id"]
            if self.value in ["sparse", "mix"]:
                for service in ["prometheus", "alertmanager"]:
                    name = f"{node}-{service}"
                    volumes[name] = self._generate_volume(name, "sparse", node)
            if self.value in ["block", "mix"]:
                for service in ["loki", "cool-app"]:
                    name = f"{node}-{service}"
                    volumes[name] = self._generate_volume(name, "block", node)

        salt.utils.dictupdate.update(
            context["pillar"], {"metalk8s": {"volumes": volumes}}
        )


class ExtraContext(DictOption):
    """Pass in additional context values for rendering a template."""

    def update_context(self, context: Dict[str, Any]) -> None:
        context.update(self.value)

    def __repr__(self) -> str:
        details = "\n".join(
            f"      {key}: {value!r}" for key, value in self.value.items()
        )
        return f"{super().__repr__()}\n{details}"


class PillarOverrides(DictOption):
    """Override pillar data for a specific template."""

    def update_context(self, context: Dict[str, Any]) -> None:
        salt.utils.dictupdate.update(context["pillar"], self.value)


class KubernetesOverrides(DictOption):
    """Declare resources to add/remove/edit in the mocked K8s API."""

    def update_context(self, context: Dict[str, Any]) -> None:
        assert "__kubernetes__" in context
        for action, objects in self.value.items():
            if action == "add":
                for obj in objects:
                    context["__kubernetes__"].setdefault(
                        obj["apiVersion"], {}
                    ).setdefault(obj["kind"], []).append(obj)
            if action == "remove":
                for obj in objects:
                    api_group = context["__kubernetes__"][obj["apiVersion"]]
                    api_group[obj["kind"]] = [
                        existing
                        for existing in api_group[obj["kind"]]
                        if not all(
                            [
                                existing["metadata"].get(key)
                                == obj["metadata"].get(key)
                                for key in ["name", "namespace"]
                            ]
                        )
                    ]
            if action == "edit":
                raise NotImplementedError(
                    "Editing mocked K8s objects is not supported yet"
                )


# pylint: enable=too-few-public-methods

# Register sub-classes of `BaseOption`, with the same key as desired in the
# configuration file
OPTION_KINDS: Dict[str, Type[BaseOption]] = {
    "os": OS,
    "extra_context": ExtraContext,
    "k8s_overrides": KubernetesOverrides,
    "minion_state": MinionState,
    "mode": MinionMode,
    "pillar_overrides": PillarOverrides,
    "saltenv": Saltenv,
    "volumes": Volumes,
}


class TestCase(NamedTuple):
    """A test case encapsulating options for mutating the rendering context."""

    id: str
    options: List[BaseOption]


def get_cases(template: Path) -> List[TestCase]:
    """List all test cases for a template path by parsing the configuration hierarchy.

    See the docstring for this module for an overview of the principles.
    """
    cases = {"<default>": copy.deepcopy(DEFAULT_CASE)}
    should_skip = False

    config = TESTS_CONFIG
    for part in template.parts:
        config = config.get(part, {})

        # Always use the most specific definition of `_cases`
        cases = config.get("_cases", cases)

        _skip = config.get("_skip", None)
        if _skip is not None:
            # Keep iterating through parts, as one may decide to skip a whole directory
            # but re-enable some files under it.
            should_skip = _skip

    if should_skip:
        return []

    return [
        TestCase(id=case_id, options=list(_cast_options(case_options)))
        for case_id, case_options in _generate_test_cases(cases)
    ]


def _generate_test_cases(cases: Dict[str, Any]) -> Iterator[Tuple[str, Dict[str, Any]]]:
    for case_id, case_options in cases.items():
        sub_cases = case_options.pop("_subcases", None)
        if sub_cases is not None:
            for sub_id, sub_options in _generate_test_cases(sub_cases):
                yield f"{case_id} - {sub_id}", dict(case_options, **sub_options)
        else:
            yield case_id, case_options


def _cast_options(case_options: Dict[str, Any]) -> Iterator[BaseOption]:
    # Always use the default case definition as a basis
    enriched = dict(DEFAULT_CASE, **case_options)
    for option_key, option_value in enriched.items():
        try:
            option_cls = OPTION_KINDS[option_key]
        except KeyError:
            pytest.fail(f"Option '{option_key}' is not registered")

        yield option_cls(option_value)
