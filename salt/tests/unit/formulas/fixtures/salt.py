"""Expose a simple mock of Salt execution modules for use in templates."""

import functools
from typing import Any, Callable, Dict, Optional, Type
from unittest.mock import MagicMock

import jinja2
import salt.utils.data  # type: ignore


# Default minion configuration
DEFAULT_CONFIG = {
    "file_client": "local",
}

# The "public methods" are dynamically added by the `register` decorator
# pylint: disable=too-few-public-methods
class SaltMock:
    """A mock of the `salt` object to provide in a Jinja rendering context.

    This mock relies on other mocks to compute reasonable return values:
      - the Jinja Environment object, for reading other templates when required
      - the Salt `grains` and `pillar` dictionaries
      - the Salt minion `config` overrides (by default, uses `DEFAULT_CONFIG`)

    This mock will expose methods as the real `salt` object, using both "getitem"-style
    (`salt['module.method']`) and "getattr"-style (`salt.module.method`).
    """

    # Dict only containing 'module.method' keys, with values as plain Python functions
    # which accept a SaltMock instance as first argument.
    MOCKS: Dict[str, Callable[..., Any]] = {}

    def __init__(
        self,
        environment: jinja2.Environment,
        grains: Dict[str, Any],
        pillar: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None,
    ):
        self._env = environment
        self._grains = grains
        self._pillar = pillar
        self._config = dict(DEFAULT_CONFIG, **(config or {}))

    def __getitem__(self, key: str) -> Any:
        try:
            mock_func = SaltMock.MOCKS[key]
        except KeyError as exc:
            raise KeyError(f"Mocked `salt` has no method '{key}' registered") from exc
        return functools.partial(mock_func, self)


# Mocks registration {{{
MockFunc = Callable[..., Any]


class ModuleMock:
    """Base-class for mocking a Salt execution module.

    Each mocked module will define a subclass, and the `register` decorator will attach
    the mocked functions to this class as instance properties.
    The mocked module class will be attached to SaltMock as a property as well, to
    allow passing the SaltMock instance to the mocked functions.
    """

    def __init__(self, salt_mock: SaltMock):
        self._salt_mock = salt_mock


MODULE_MOCKS: Dict[str, Type[ModuleMock]] = {}


# pylint: enable=too-few-public-methods

# And since we know what we are doing, but want to make sure these attributes are not
# mistakenly exposed when rendering templates:
# pylint: disable=protected-access


def register(
    func_name: str, inject_mock: bool = True
) -> Callable[[MockFunc], MockFunc]:
    """Register mocked Salt execution methods with a decorator.

    Examples:

    .. code::

       # A dummy example
       @register("test.ping", inject_mock=False)
       def test_ping(*args, **kwargs):
           return {"ret": {}}

       # A more involved example, using a SaltMock instance
       @register("grains.get")
       def grains_get(salt_mock, key):
           res = salt_mock._grains.copy()
           for part in key.split(":"):
               res = res[part]
           return res

    Implementation details:

    The decorator will attach a mock method to the SaltMock class in multiple
    ways:

    - in SaltMock.MOCKS, with the key "module.method" passed in to this decorator
    - through a ModuleMock subclass, added as a class attribute to SaltMock with the
      module name, and for which methods are added also as class attributes
    """
    mod_name, method_name = func_name.split(".")
    try:
        mod_cls = MODULE_MOCKS[mod_name]
    except KeyError:
        # We use a helpful name for the subclass for easier troubleshooting when tests
        # fail. If we're missing a 'test' method from a registered 'example' module, we
        # will get a message saying "'SaltMock_example' has no attribute 'test'".
        mock_cls_name = f"SaltMock_{mod_name}"
        mod_cls = type(mock_cls_name, (ModuleMock,), {})
        MODULE_MOCKS[mod_name] = mod_cls
        setattr(SaltMock, mod_name, property(mod_cls))

    def decorator(mock_func: MockFunc) -> MockFunc:
        def decorated(salt_mock: SaltMock, *args: Any, **kwargs: Any) -> Any:
            if inject_mock:
                return mock_func(salt_mock, *args, **kwargs)
            return mock_func(*args, **kwargs)

        SaltMock.MOCKS[func_name] = decorated
        setattr(
            mod_cls,
            method_name,
            property(
                lambda mod_mock: functools.partial(decorated, mod_mock._salt_mock)
            ),
        )
        return decorated

    return decorator


def register_basic(func_name: str) -> Callable[[MockFunc], MockFunc]:
    """Shorthand for registering mocks which do not need a SaltMock instance."""
    return register(func_name, inject_mock=False)


# }}}
# Mock definitions {{{

# Data-driven mocks {{{
@register("grains.filter_by")
def grains_filter_by(
    salt_mock: SaltMock,
    lookup_dict: Dict[str, Any],
    grain: str = "os_family",
    **kwargs: Any,
) -> Any:
    """Read grains from a SaltMock instance to implement grains.filter_by.

    See https://github.com/saltstack/salt/blob/v3002.5/salt/modules/grains.py#L482-L592.
    """
    return salt.utils.data.filter_by(
        lookup_dict=lookup_dict,
        lookup=grain,
        traverse=salt_mock._grains,
        **kwargs,
    )


@register("metalk8s.get_archives")
def metalk8s_get_archives(salt_mock: SaltMock) -> Dict[str, Dict[str, str]]:
    """Derive a map of MetalK8s archives from available pillar data."""
    current_version = salt_mock._pillar["metalk8s"]["cluster_version"]
    major_minor, _, patch_suffix = current_version.rpartition(".")
    patch, _, _ = patch_suffix.partition("-")

    result = {}
    for idx, archive in enumerate(salt_mock._pillar["metalk8s"]["archives"]):
        # NOTE: assumption is made that the first archive in pillar will match the
        # current version - though it shouldn't affect the rendering logic.
        version = current_version if idx == 0 else f"{major_minor}.{int(patch) + idx}"
        result[f"metalk8s-{version}"] = {
            "path": f"/srv/scality/metalk8s-{version}",
            "iso": archive,
            "version": f"{version}",
        }
    return result


# }}}
# Static mocks {{{

# Used in metalk8s.internal.preflight.mandatory to check swap is not used.
register_basic("mount.swaps")(MagicMock(return_value={}))

# Used in metalk8s.internal.preflight.mandatory to check ports are free.
register_basic("network.connect")(MagicMock(return_value=dict(result=False)))

# }}}

# pylint: enable=protected-access
# }}}
