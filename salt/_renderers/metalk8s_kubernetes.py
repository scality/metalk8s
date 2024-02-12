"""A renderer for Kubernetes YAML manifests.

Given a Kubernetes YAML file (which may be a stream of objects, i.e. YAML
snippets separated by `---` lines), this will render a sequence of states
(represented as an OrderedDict), mapping every such object to an invocation
of our custom `object_[present|absent]` state function.

To use it, add a shebang like `#!metalk8s_kubernetes` as the first line of your
manifests SLS file. Optionally, you can use rendering pipelines (if templating
is required), e.g. `#!jinja | metalk8s_kubernetes`.

The shebang also supports passing options to this renderer, in the format
`#!metalk8s_kubernetes argument1=value1&argument2=value2` (basically, a query
string in the `application/x-www-form-urlencoded` format).
The supported options are:
- `kubeconfig`, the path to the kubeconfig file to use for communicating with
  K8s API (defaults define in salt-master configuration)
- `context`, the context from the kubeconfig to use (defaults define in
  salt-master configuration
- `absent`, a boolean to toggle which state function variant (`object_present`
  or `object_absent`) to use (defaults to False)
"""
import six
import yaml

from salt.exceptions import SaltRenderError
from salt.utils.yaml import SaltYamlSafeLoader
from salt.utils.odict import OrderedDict

__virtualname__ = "metalk8s_kubernetes"


def __virtual__():
    return __virtualname__


def _step_name(manifest, absent=False):
    try:
        name = manifest["metadata"]["name"]
    except KeyError as exc:
        raise SaltRenderError("Object `metadata.name` must be set.") from exc

    namespace = manifest["metadata"].get("namespace", None)
    if namespace is not None:
        full_name = f"{namespace}/{name}"
    else:
        full_name = name

    return (
        f"{'Remove' if absent else 'Apply'} "
        f"{manifest['apiVersion']}/{manifest['kind']} '{full_name}'"
    )


def _step(manifest, kubeconfig=None, context=None, absent=False):
    """Render a single Kubernetes object into a state 'step'."""
    step_name = _step_name(manifest, absent)
    state_func = f"metalk8s_kubernetes.object_{'absent' if absent else 'present'}"
    state_args = [
        {"name": step_name},
        {"kubeconfig": kubeconfig},
        {"context": context},
        {"manifest": manifest},
    ]

    return step_name, {state_func: state_args}


def render(
    source, saltenv="", sls="", argline="", **_kwargs
):  # pylint: disable=unused-argument
    args = six.moves.urllib.parse.parse_qs(argline)

    kubeconfig = args.get("kubeconfig", [None])[0]
    context = args.get("context", [None])[0]
    absent = args.get("absent", [False])[0]

    # Allow to force absent arg from pillar
    if (
        __pillar__.get("_metalk8s_kubernetes_renderer", {}).get("force_absent")
        is not None
    ):
        absent = __pillar__["_metalk8s_kubernetes_renderer"]["force_absent"]

    if not isinstance(source, six.string_types):
        # Assume it is a file handle
        source = source.read()

    data = yaml.load_all(source, Loader=SaltYamlSafeLoader)

    return OrderedDict(
        _step(manifest, kubeconfig=kubeconfig, context=context, absent=absent)
        for manifest in data
        if manifest
    )
