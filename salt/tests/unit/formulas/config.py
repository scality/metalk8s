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

from tests.unit.formulas import paths

CONFIG_FILE = paths.BASE_DIR / "config.yaml"

with CONFIG_FILE.open("r") as config_file:
    TESTS_CONFIG = yaml.safe_load(config_file)


DEFAULT_OPTIONS = TESTS_CONFIG["default_opts"]


# pylint: disable=too-few-public-methods
class BaseOption:
    """Base-class for registering "option kinds".

    The default behavior is to check if the configured value, passed to the
    constructor, is allowed.
    """

    ALLOWED_VALUES: FrozenSet[Any] = frozenset()

    def __init__(self, value: Any):
        assert (
            value in self.ALLOWED_VALUES
        ), f"Value '{value}' is not allowed for option {self.__class__.__qualname__}"
        self.value = value

    def update_context(self, context: Dict[str, Any]) -> None:
        """Update the existing context given the selected value."""


# pylint: enable=too-few-public-methods

# Register sub-classes of `BaseOption`, with the same key as desired in the
# configuration file
OPTION_KINDS: Dict[str, Type[BaseOption]] = {}

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
