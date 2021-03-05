"""Expose configuration options to generate test cases for rendering formulas.

Options are read from a configuration file, following this format:
- a root-level "default_opts" key defines default options to use
- other keys define directories and/or file names for which to override the default
  options (higher specificity takes precedence, see the `get_options` method)
- outside of the "default_opts" key, overrides are specified by the "_opts" key
- options are passed as a map from <option_name> to an array of <option_value>s
- the special key "_skip" can be used to omit rendering of a specific directory or file
  (uses a Boolean value, defaults to False)

The Cartesian product of each option's allowed values generates the full set of test
cases for a given formula (see the `generate_option_combinations` method).
"""

import itertools
from pathlib import Path
from typing import Any, Dict, FrozenSet, Iterable, List, Optional, Type

import yaml
import salt.utils.dictupdate  # type: ignore

from tests.unit.formulas import paths

CONFIG_FILE = paths.BASE_DIR / "config.yaml"

with CONFIG_FILE.open("r") as config_file:
    TESTS_CONFIG = yaml.safe_load(config_file)


DEFAULT_OPTIONS = TESTS_CONFIG["default_opts"]


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

    The expected value format will be a dictionary with a single key, used as
    an identifier for this value (to show in case of test failure), and the
    corresponding value being stored in the `data` attribute, for later use
    when updating the context.
    """

    def __init__(self, value: Dict[str, Dict[str, Any]]):
        assert (
            len(value.keys()) == 1
        ), f"Can only provide a single key to {self.__class__.__qualname__} options"
        _id, data = next(iter(value.items()))

        # Store the _id as value for use in __repr__
        super().__init__(value=_id)
        self.data: Dict[str, Any] = data


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
        context.update(self.data)

    def __repr__(self) -> str:
        details = "\n".join(
            f"      {key}: {value!r}" for key, value in self.data.items()
        )
        return f"{super().__repr__()}\n{details}"


class PillarOverrides(DictOption):
    """Override pillar data for a specific template."""

    def update_context(self, context: Dict[str, Any]) -> None:
        salt.utils.dictupdate.update(context["pillar"], self.data)


class KubernetesOverrides(DictOption):
    """Declare resources to add/remove/edit in the mocked K8s API."""

    def update_context(self, context: Dict[str, Any]) -> None:
        assert "__kubernetes__" in context
        for action, objects in self.data.items():
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

OptionSet = Iterable[BaseOption]


def get_options(template: Path) -> Optional[Dict[str, List[Any]]]:
    """Compute the options for a template path by parsing the configuration hierarchy.

    See the docstring for this module for an overview of the principles.
    """
    options = DEFAULT_OPTIONS.copy()
    should_skip = False
    config = TESTS_CONFIG

    for part in template.parts:
        config = config.get(part, {})
        options.update(config.get("_opts", {}))

        _skip = config.get("_skip", None)
        if _skip is not None:
            # Keep iterating through parts, as one may decide to skip a whole directory
            # but re-enable some files under it.
            should_skip = _skip

    return None if should_skip else options


# pylint: disable=wrong-spelling-in-docstring
def generate_option_combinations(options: Dict[str, List[str]]) -> Iterable[OptionSet]:
    """Generate the Cartesian product of all possible option values.

    This function handles checking if the key is registered in `OPTION_KINDS`, and casts
    the provided values as instances of their own `BaseOption`-subclasses.

    To remind the reader of what a cartesian product is, here is an example:

    .. code-block:: python

       >>> options = {"size": ["small", "big", "huuuge"], "color": ["blue", "red"]}
       >>> for combination in itertools.product(*options.values()):
       ...     print(combination)
       ('small', 'blue')
       ('small', 'red')
       ('big', 'blue')
       ('big', 'red')
       ('huuuge', 'blue')
       ('huuuge', 'red')
    """
    option_sets = []
    for key, option_values in options.items():
        option_kind = OPTION_KINDS[key]
        option_sets.append([option_kind(value) for value in option_values])
    return itertools.product(*option_sets)
