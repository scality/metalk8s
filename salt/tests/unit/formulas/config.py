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
import re
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

with CONFIG_FILE.open("r", encoding="utf-8") as config_file:
    TESTS_CONFIG = yaml.safe_load(config_file)


DEFAULT_CASE = TESTS_CONFIG["default_case"]


# pylint: disable=too-few-public-methods
class BaseOption:
    """Base-class for registering "option kinds"."""

    # PRIORITY is used for ordering the application of options on a given context
    # A higher PRIORITY means an earlier application
    PRIORITY = 1

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

    PRIORITY = 8

    def __init__(self, value: str):
        match = re.match(r"^metalk8s-(?P<version>2\.\d+\.\d+)$", value)
        assert (
            match is not None
        ), f"Value '{value}' does not match saltenv format 'metalk8s-<version>'"

        super().__init__(value)
        self.version = match.group("version")

    def update_context(self, context: Dict[str, Any]) -> None:
        context["pillar"].setdefault("metalk8s", {})["cluster_version"] = self.version

        nodes_pillar = context["pillar"]["metalk8s"].get("nodes", {})
        for node in nodes_pillar:
            nodes_pillar[node]["version"] = self.version

        context["saltenv"] = self.value


class OS(EnumOption):
    """Simulate one of the OS distributions supported by MetalK8s."""

    ALLOWED_VALUES: FrozenSet[str] = frozenset(("CentOS/7", "RedHat/7", "RedHat/8"))

    def update_context(self, context: Dict[str, Any]) -> None:
        os_name, release = self.value.split("/")
        grains = context["grains"]
        grains["os"] = os_name
        grains["os_family"] = "RedHat"
        grains["osmajorrelease"] = release


class Architecture(EnumOption):
    """Simulate one of the supported deployment architectures."""

    PRIORITY = 9

    ALLOWED_VALUES: FrozenSet[str] = frozenset(
        ("single-node", "compact", "standard", "extended")
    )

    def update_context(self, context: Dict[str, Any]) -> None:
        if self.value == "single-node":
            # Nothing to do, it's the default context
            return

        metalk8s_pillar = context["pillar"]["metalk8s"]
        if "nodes" not in metalk8s_pillar:
            pytest.fail(
                "Cannot use custom architectures with an empty `pillar:metalk8s`"
            )

        current_version = metalk8s_pillar["cluster_version"]

        # Declare additional nodes as { <node name>: [<node role>, ...], ... }
        new_nodes: Dict[str, List[str]] = {}

        def _add(basename: str, count: int, roles: List[str]) -> None:
            new_nodes.update(
                {f"{basename}-{index + 1}": roles for index in range(count)}
            )

        if self.value == "compact":
            _add("master", 2, ["master", "etcd", "infra", "node"])

        elif self.value == "standard":
            _add("master", 2, ["master", "etcd", "infra"])
            _add("worker", 3, ["node"])

        elif self.value == "extended":
            _add("master", 2, ["master", "etcd"])
            _add("infra", 2, ["infra"])
            _add("worker", 3, ["node"])

        metalk8s_pillar["nodes"].update(
            {
                node_name: {"roles": roles, "version": current_version}
                for node_name, roles in new_nodes.items()
            }
        )
        context["__minions__"].update({minion: {} for minion in new_nodes})

        known_nodes = context["__kubernetes__"].get("v1", {}).get("Node", [])
        assert (
            len(known_nodes) >= 1
        ), "Must pre-configure K8s mock with at least one node"

        for node_name, roles in new_nodes.items():
            node = next(
                (n for n in known_nodes if n["metadata"]["name"] == node_name),
                None,
            )
            if node is None:
                node = copy.deepcopy(known_nodes[0])
                node["metadata"]["name"] = node_name
                known_nodes.append(node)

            # Clear roles before setting them
            node["metadata"]["labels"] = {
                key: val
                for key, val in node["metadata"].get("labels", {}).items()
                if not key.startswith("node-role.kubernetes.io/")
            }

            for role in roles:
                node["metadata"][f"node-role.kubernetes.io/{role}"] = ""

            # Overwrite taints
            if "node" in roles:
                taints = []
            elif "infra" in roles:
                taints = ["infra"]
            else:  # only 'master' and 'etcd' in roles
                taints = ["master"]

            node["spec"]["taints"] = [
                {"key": taint, "effect": "NoSchedule"} for taint in taints
            ]


class MinionMode(EnumOption):
    """Switch between rendering on a plain minion or the master minion."""

    PRIORITY = 7

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
    - "new": Clean up the custom grains and remove from list of minions
      to simulate a fresh minion install
    - "standalone": No ext pillar, local file client
    """

    PRIORITY = 4

    ALLOWED_VALUES: FrozenSet[str] = frozenset(("ready", "new", "standalone"))

    def update_context(self, context: Dict[str, Any]) -> None:
        if self.value == "ready":
            # Nothing to do
            return

        if self.value == "new":
            context["grains"].pop("metalk8s", None)

            if context["opts"].get("__role") == "master":
                # If running from the master, we assume the target we care
                # about is in pillar.orchestrate.node_name
                target_minion = context["pillar"]["orchestrate"]["node_name"]
            else:
                target_minion = context["grains"]["id"]

            context["__minions__"].pop(target_minion)

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

    PRIORITY = 6

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

    PRIORITY = 5

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
                            existing["metadata"].get(key) == obj["metadata"].get(key)
                            for key in ["name", "namespace"]
                        )
                    ]
            if action == "edit":
                for patch in objects:
                    try:
                        api_group = context["__kubernetes__"][patch["apiVersion"]]
                        items = api_group[patch["kind"]]
                        item = next(
                            filter(
                                # This is a false positive
                                # See https://github.com/pylint-dev/pylint/issues/7100
                                # pylint: disable=cell-var-from-loop
                                lambda obj: all(
                                    obj["metadata"].get(key)
                                    == patch["metadata"].get(key)
                                    for key in ["name", "namespace"]
                                ),
                                items,
                            )
                        )
                    except (KeyError, StopIteration):
                        pytest.fail(
                            "Cannot apply patch - could not find matching object.\n"
                            f"  Patch: {patch}"
                        )

                    salt.utils.dictupdate.update(item, patch)


# pylint: enable=too-few-public-methods

# Register sub-classes of `BaseOption`, with the same key as desired in the
# configuration file
# For clarity, the options are sorted by priority (descending order, same as runtime)
OPTION_KINDS: Dict[str, Type[BaseOption]] = {
    "architecture": Architecture,
    "saltenv": Saltenv,
    "mode": MinionMode,
    "volumes": Volumes,
    "pillar_overrides": PillarOverrides,
    "minion_state": MinionState,
    # Unspecified priority for options below, they should not rely on execution order
    # respectively to other options in this group
    "os": OS,
    "extra_context": ExtraContext,
    "k8s_overrides": KubernetesOverrides,
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
