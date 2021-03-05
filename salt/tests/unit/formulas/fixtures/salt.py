"""Expose a simple mock of Salt execution modules for use in templates."""

import functools
import ipaddress
from typing import Any, Callable, Dict, List, Optional, Type
from unittest.mock import MagicMock

import jinja2
import salt.utils.data  # type: ignore
import salt.utils.yamlloader  # type: ignore

from tests.unit.formulas.fixtures import kubernetes


# Default minion configuration
DEFAULT_CONFIG = {
    "file_client": "remote",
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
        k8s_data: kubernetes.K8sData,
        config: Optional[Dict[str, Any]] = None,
    ):
        self._env = environment
        self._grains = grains
        self._pillar = pillar
        self._k8s = kubernetes.KubernetesMock(k8s_data)
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
@register("config.get")
def config_get(salt_mock: SaltMock, *args: Any, **kwargs: Any) -> Any:
    """Read minion configuration values from a SaltMock instance."""
    return salt_mock._config.get(*args, **kwargs)


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


@register("metalk8s.minions_by_role")
def metalk8s_minions_by_role(salt_mock: SaltMock, role: str) -> List[str]:
    """Use pillar.metalk8s.nodes to derive this."""
    return [
        name
        for name, info in salt_mock._pillar["metalk8s"]["nodes"].items()
        if role in info["roles"]
    ]


@register("metalk8s_kubernetes.get_object")
def metalk8s_kubernetes_get_object(
    salt_mock: SaltMock,
    name: str,
    kind: str,
    # pylint: disable=invalid-name
    apiVersion: str,
    # pylint: enable=invalid-name
    namespace: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Forward this call to the K8s API mock."""
    return salt_mock._k8s.get(
        api_version=apiVersion, kind=kind, name=name, namespace=namespace
    )


@register("mine.get")
def mine_get(
    salt_mock: SaltMock, tgt: str, fun: str, *_a: Any, **_k: Any
) -> Dict[str, str]:
    """Build a mocked view of an expected mine and return the requested value."""

    # For now, we expect a single minion.
    assert tgt == salt_mock._grains["id"], f"Getting mine data for unknown '{tgt}'"

    mine_data = {
        "control_plane_ip": salt_mock._grains["metalk8s"]["control_plane_ip"],
        "workload_plane_ip": salt_mock._grains["metalk8s"]["workload_plane_ip"],
    }

    ca_minion = salt_mock._pillar["metalk8s"]["ca"]["minion"]
    if tgt == ca_minion:
        mine_data.update(
            {
                fun: "<b64-encoded CA cert>"
                for fun in [
                    "dex_ca_b64",
                    "ingress_ca_b64",
                    "kubernetes_etcd_ca_b64",
                    "kubernetes_front_proxy_ca_b64",
                    "kubernetes_root_ca_b64",
                    "kubernetes_sa_pub_key_b64",
                ]
            }
        )

    return {tgt: mine_data[fun]}


@register("pillar.get")
def pillar_get(salt_mock: SaltMock, key: str) -> Any:
    """Retrieve a value from the mocked pillar."""
    res = salt_mock._pillar.copy()
    for part in key.split(":"):
        res = res.get(part, {})
    return res


@register("slsutil.renderer")
def slsutil_renderer(salt_mock: SaltMock, source: str, **_kwargs: Any) -> Any:
    """Render a template assuming it comes from the same source saltenv."""
    assert source.startswith("salt://")
    template = salt_mock._env.get_template(source[len("salt://") :])
    rendered = template.render(
        grains=salt_mock._grains,
        pillar=salt_mock._pillar,
        salt=salt_mock,
    )
    return salt.utils.yamlloader.load(rendered)


# }}}
# Static mocks {{{

register_basic("file.join")(lambda *args: "/".join(args))
register_basic("file.read")(MagicMock(return_value="<file contents>"))
register_basic("hashutil.base64_b64decode")(lambda input_data: input_data)
register_basic("hashutil.base64_encodefile")(
    MagicMock(return_value="<b64-encoded data>")
)
register_basic("log.warning")(print)
register_basic("metalk8s.format_san")(", ".join)

# Static values for these IPs should be sufficient for rendering.
register_basic("metalk8s_network.get_cluster_dns_ip")(
    MagicMock(return_value="10.96.0.10")
)
register_basic("metalk8s_network.get_kubernetes_service_ip")(
    MagicMock(return_value="10.96.0.1")
)
register_basic("metalk8s_network.get_oidc_service_ip")(
    MagicMock(return_value="10.96.0.7")
)


@register_basic("metalk8s_network.get_ip_from_cidrs")
def metalk8s_network_get_ip_from_cidrs(
    cidrs: List[str],
    current_ip: Optional[str] = None,
) -> str:
    """Simple static mock for finding a host IP.

    Will not play nice if we compare selected IPs for different hosts.
    """
    if current_ip is not None:
        return current_ip

    # Pick the first IP in first CIDR
    network = ipaddress.IPv4Network(cidrs[0])
    return next(map(str, network.hosts()))


# Used in metalk8s.kubernetes.cni.calico.configured to setup virtual interfaces.
register_basic("metalk8s_network.get_mtu_from_ip")(MagicMock(return_value=1500))

# Used in most metalk8s.addons.<addon>.deployed.chart, to inject overrides.
register_basic("metalk8s_service_configuration.get_service_conf")(
    lambda _namespace, _name, defaults: defaults
)

# Used in metalk8s.salt.master.installed to mount Solution ISOs in the salt-master Pod.
register_basic("metalk8s_solutions.list_available")(MagicMock(return_value={}))


@register_basic("metalk8s_solutions.manifest_from_iso")
def metalk8s_solutions_manifest_from_iso(path: str) -> Dict[str, Any]:
    """Infer a mock manifest from the provided path.

    Expects the path to be of the form: /srv/scality/releases/<name>-<version>.iso
    """
    dirname, _, basename = path.rpartition("/")
    assert dirname == "/srv/scality/releases"
    assert basename.endswith(".iso")
    solution_id = basename[: -len(".iso")]
    name, _, version = solution_id.rpartition("-")
    return {
        "id": solution_id,
        "display_name": " ".join(map(str.capitalize, name.split("-"))),
        "version": version,
        "name": name,
    }


# Used in metalk8s.internal.preflight.mandatory to check swap is not used.
register_basic("mount.swaps")(MagicMock(return_value={}))

# Used in metalk8s.internal.preflight.mandatory to check ports are free.
register_basic("network.connect")(MagicMock(return_value=dict(result=False)))

# }}}

# pylint: enable=protected-access
# }}}
