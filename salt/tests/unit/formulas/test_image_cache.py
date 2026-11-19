"""Tests for the requisites of the image cache states.

The rendering tests only prove that a template can be rendered. Here we check the
ordering the `containerd-image-preload` timer needs: it fires as soon as it is
started, and the import it runs goes into a containerd that must already be up.

The provisioning states add an ordering of their own. On the first node there is
no registry to pull from, so the kubelet must not start before the cache holds
its archives and they have been imported.
"""

from pathlib import Path
import re
from typing import Any, Dict, Iterable, Set
from unittest.mock import MagicMock
import jinja2
import pytest
import salt.utils.yaml  # type: ignore

from tests.unit.formulas import config
from tests.unit.formulas.fixtures import salt as salt_fixtures
from tests.unit.formulas.fixtures.context import Context, make_context
from tests.unit.formulas.fixtures.rendered import (
    RenderedStates,
    required_states,
    requisite_states,
)

IMAGE_CACHE_INSTALLED = Path("metalk8s/image-cache/installed.sls")
IMAGE_CACHE_PROVISIONED = Path("metalk8s/image-cache/provisioned.sls")
IMAGE_CACHE_PULLED = Path("metalk8s/image-cache/pulled.sls")
IMAGE_CACHE_RESOURCES = Path("metalk8s/addons/image-cache-agent/deployed/resources.sls")
BOOTSTRAP_LOCAL = Path("metalk8s/roles/bootstrap/local.sls")
EARLY_STAGE_BOOTSTRAP = Path("metalk8s/roles/internal/early-stage-bootstrap.sls")
NODE_ROLE = Path("metalk8s/roles/node/init.sls")
DEPLOY_NODE = Path("metalk8s/orchestrate/deploy_node.sls")
UPGRADE_PRE = Path("metalk8s/orchestrate/upgrade/pre.sls")
UPGRADE_POST = Path("metalk8s/orchestrate/upgrade/post.sls")
IMAGE_CACHE_POST_UPGRADE = Path("metalk8s/addons/image-cache-agent/post-upgrade.sls")
FLAT_ARCHIVES_ABSENT = Path("metalk8s/image-cache/flat-archives-absent.sls")

# The formula that transitively brings in every state we require, so it must stay
# in the `include` block. It defines `Install containerd`, and it includes both
# `metalk8s.repo`, for `Repositories configured`, and the containerd `running`
# state, for `Ensure containerd is ready`.
REQUIRED_FORMULA = "metalk8s.container-engine.containerd.installed"

TIMER_STATE = "Ensure containerd image preload timer running"

# What the formula renders instead when the node runs no containerd.
NO_ENGINE_STATE = "No containerd to preload images into"

# States the timer must depend on: its own package, the containerd package the
# preload script needs, and the readiness check on the running engine.
REQUIRED_GATES = [
    "Install containerd image preload",
    "Configure containerd image preload",
    "Install containerd",
    "Ensure containerd is ready",
    "Repositories configured",
]

CONFIG_STATE = "Configure containerd image preload"

DIRECTORY_STATE = "Create the image cache directory"
# The command every fill runs comes from its own package.
COMMAND_STATE = "Install imagecachectl"
# The bootstrap node holds the control plane, etcd, the registry and workloads,
# so it gets every variant.
VARIANTS = ("worker", "control-plane", "etcd", "registry")
# The label the post-upgrade selects the old resources by.
PART_OF_METALK8S = {"app.kubernetes.io/part-of": "metalk8s"}
PROVISION_STATES = [
    f"Import the {variant} boot cache from the ISO" for variant in VARIANTS
]
IMPORT_STATE = "Import the boot cache archives into containerd"
KUBELET_STATE = "Ensure kubelet running"
GATE_STATE = "Ensure the image cache is filled before the kubelet starts"
PROVISIONED_SLS = "metalk8s.image-cache.provisioned"

# What the provisioning renders instead when the node runs no containerd.
NO_PROVISION_STATE = "No image cache to provision"

PULL_STATE = "Pull the worker boot cache from the registry"
# Not IMPORT_STATE: both SLS can land in one run, and Salt refuses an ID
# declared twice.
PULL_IMPORT_STATE = "Import the pulled boot cache archives into containerd"
# What the pull renders instead when the node runs no containerd.
NO_PULL_STATE = "No image cache to pull"
PULLED_SLS = "metalk8s.image-cache.pulled"
# The source version of an upgrade into this one has no image cache agent, so
# the upgrade deploys it whole, with its resource definition, before any node.
IMAGE_CACHE_ADDON = "metalk8s.addons.image-cache-agent.deployed"
SYNC_CHECK = "metalk8s_checks.image_caches_synced"
# Where the ImageCache resources of the target version are declared.
IMAGE_CACHE_RESOURCES_SLS = "metalk8s.addons.image-cache-agent.deployed.resources"
# One wait for every node: the agent pulls on all of them at once.
WAIT_STATE = "Wait for the image cache of every node"
# The node the `deploy_node.sls` cases target, and the case where it already
# completed a deployment.
DEPLOYED_NODE = "master-1"
FIRST_DEPLOY_ONLY_CASE = "Node completed a deployment before"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_INSTALLED], indirect=True)
def test_preload_timer_requires_a_running_containerd(
    rendered_states: RenderedStates,
) -> None:
    """Check the preload timer only starts once containerd is installed and ready."""
    checked = False

    for case_id, states in rendered_states:
        if TIMER_STATE not in states:
            # Nothing to preload into, the formula must not pull containerd in.
            assert (
                NO_ENGINE_STATE in states
            ), f"no '{NO_ENGINE_STATE}' state ({case_id})"
            assert "include" not in states, f"unexpected includes ({case_id})"
            continue

        includes = states.get("include", [])
        assert (
            REQUIRED_FORMULA in includes
        ), f"'{REQUIRED_FORMULA}' is not included, the gates cannot resolve ({case_id})"

        gates = required_states(states, TIMER_STATE)
        for gate in REQUIRED_GATES:
            missing_gate = (
                f"'{TIMER_STATE}' does not require '{gate}', the timer could fire"
                " before containerd can serve the import"
            )
            assert gate in gates, f"{missing_gate} ({case_id})"

        checked = True

    assert (
        checked
    ), "no rendering case installs the timer, the requisites went unchecked"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [EARLY_STAGE_BOOTSTRAP], indirect=True)
def test_provisioning_runs_before_the_kubelet(
    rendered_states: RenderedStates,
) -> None:
    """Check the cache is filled before the kubelet may start.

    In the early stage of the bootstrap, and not in a role SLS: `bootstrap.sh`
    and `restore.sh` apply it before the kubelet ever starts, and the `highstate`
    must not run any image cache command. An `_in` requisite only resolves
    against a state in the same run.
    """
    for case_id, states in rendered_states:
        assert GATE_STATE in states, f"the ordering gate is gone ({case_id})"

        waits_for = requisite_states(states, GATE_STATE)
        assert PROVISIONED_SLS in waits_for, (
            f"'{GATE_STATE}' does not require '{PROVISIONED_SLS}', it gates"
            f" nothing ({case_id})"
        )

        releases = requisite_states(states, GATE_STATE, "require_in")
        assert KUBELET_STATE in releases, (
            f"'{GATE_STATE}' is not ordered before '{KUBELET_STATE}', the"
            f" kubelet could start on a node whose cache is empty ({case_id})"
        )

        includes = states.get("include", [])
        # `roles.bootstrap.local` brings in `kubelet.standalone`.
        for included in (PROVISIONED_SLS, "metalk8s.roles.bootstrap.local"):
            assert included in includes, (
                f"'{included}' is not included, the requisites of"
                f" '{GATE_STATE}' cannot resolve ({case_id})"
            )


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_PROVISIONED], indirect=True)
def test_import_follows_the_provisioning(
    rendered_states: RenderedStates,
) -> None:
    """Check the one shot import runs on new archives, and not before its package."""
    checked = False

    for case_id, states in rendered_states:
        if NO_PROVISION_STATE in states:
            # The early stage of the bootstrap requires this SLS as a whole,
            # so its no-containerd branch has to declare a state of its own.
            assert not set(PROVISION_STATES) & set(
                states
            ), f"'{NO_PROVISION_STATE}' next to an import ({case_id})"
            continue

        for provision_state in PROVISION_STATES:
            assert provision_state in states, f"no '{provision_state}' ({case_id})"

            assert DIRECTORY_STATE in required_states(states, provision_state), (
                f"'{provision_state}' does not require '{DIRECTORY_STATE}', it"
                f" would write into a directory nothing created ({case_id})"
            )

            triggers = requisite_states(states, provision_state, "onchanges_in")
            triggers |= requisite_states(states, IMPORT_STATE, "onchanges")
            assert provision_state in triggers, (
                f"'{IMPORT_STATE}' does not watch '{provision_state}', new"
                f" archives would wait for the next firing of the timer ({case_id})"
            )

        assert TIMER_STATE in required_states(states, IMPORT_STATE), (
            f"'{IMPORT_STATE}' does not require '{TIMER_STATE}', it could run"
            f" before the package it comes from is installed ({case_id})"
        )
        includes = states.get("include", [])
        assert (
            ".installed" in includes
        ), f"'{TIMER_STATE}' is not included, the requisite cannot resolve ({case_id})"

        checked = True

    assert (
        checked
    ), "no rendering case provisions the cache, the requisites went unchecked"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_INSTALLED], indirect=True)
def test_preload_reads_the_configured_cache_directory(
    rendered_states: RenderedStates,
) -> None:
    """Check the package configuration is written, and written before use.

    The cache directory is a pillar value. Salt writes the states against
    it, so it has to render the sysconfig the preload script reads from the
    same value, or the two drift apart in silence.
    """
    checked = False

    for case_id, states in rendered_states:
        if CONFIG_STATE not in states:
            assert (
                NO_ENGINE_STATE in states
            ), f"no '{NO_ENGINE_STATE}' state ({case_id})"
            continue

        config_state = states[CONFIG_STATE]["file.managed"]
        contents = next(arg["contents"] for arg in config_state if "contents" in arg)
        assert any(
            line.startswith("IMAGE_CACHE_DIR=") for line in contents
        ), f"the sysconfig does not set IMAGE_CACHE_DIR ({case_id})"

        assert "Install containerd image preload" in required_states(
            states, CONFIG_STATE
        ), (
            f"'{CONFIG_STATE}' does not require the package, it would write a"
            f" file the package then owns ({case_id})"
        )

        checked = True

    assert (
        checked
    ), "no rendering case configures the package, the requisites went unchecked"


def _state_args(states: Dict[str, Any], state_id: str) -> Dict[str, Any]:
    """Return the arguments of a single-function state as one mapping."""
    (body,) = states[state_id].values()
    return {key: value for arg in body for key, value in arg.items()}


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_PROVISIONED], indirect=True)
def test_provisioning_names_match_the_image_cache_resources(
    rendered_states: RenderedStates, metalk8s_versions: Any
) -> None:
    """Check each import is named after the ImageCache resource that owns it.

    The image cache agent finds the directory by that name. Another name and
    the agent pulls the same archives again, next to the ones already there.
    """
    checked = False

    for case_id, states in rendered_states:
        if NO_PROVISION_STATE in states:
            continue

        for variant, state_id in zip(VARIANTS, PROVISION_STATES):
            version = metalk8s_versions["images"][f"metalk8s-boot-cache-{variant}"][
                "version"
            ]
            args = _state_args(states, state_id)
            expected = f"{variant}-{version.replace('.', '-')}"
            assert (
                args["name"] == expected
            ), f"'{state_id}' is named '{args['name']}', not '{expected}' ({case_id})"
            assert args["source"].endswith(
                f"/images/metalk8s-boot-cache-{variant}-{version}.tar"
            ), f"'{state_id}' does not read its ISO archive ({case_id})"
            assert args.get("cache_path"), f"'{state_id}' sets no cache ({case_id})"
            assert COMMAND_STATE in required_states(states, state_id), case_id
            # Read from the ISO: no registry to hang on.
            assert "timeout" not in args, f"'{state_id}' has a timeout ({case_id})"

        checked = True

    assert checked, "no rendering case provisions the cache, the names went unchecked"


# The node role label each variant selects, `None` for every node.
RESOURCE_NODE_SELECTORS = {
    "worker": None,
    "control-plane": {"node-role.kubernetes.io/master": ""},
    "etcd": {"node-role.kubernetes.io/etcd": ""},
    "registry": {"node-role.kubernetes.io/registry": ""},
}


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_RESOURCES], indirect=True)
def test_image_cache_resources_adopt_the_provisioned_cache(
    rendered_states: RenderedStates, metalk8s_versions: Any
) -> None:
    """Check each ImageCache is named after the directory `imagecachectl` fills.

    Same name as in `test_provisioning_names_match_the_image_cache_resources`,
    or the agent pulls the variant again next to the copy already there. The
    source names the endpoint address: the agent does not go through containerd.
    The `part-of` label is what the post-upgrade selects the old resources by.
    """
    for case_id, states in rendered_states:
        for variant, node_selector in RESOURCE_NODE_SELECTORS.items():
            version = metalk8s_versions["images"][f"metalk8s-boot-cache-{variant}"][
                "version"
            ]
            manifest = _state_args(states, f"Create the {variant} ImageCache")[
                "manifest"
            ]
            assert manifest["metadata"]["name"] == (
                f"{variant}-{version.replace('.', '-')}"
            ), case_id
            assert manifest["spec"].get("nodeSelector") == node_selector, case_id
            assert manifest["metadata"].get("labels") == PART_OF_METALK8S, case_id
            assert re.fullmatch(
                rf"[0-9.]+:[0-9]+/[^/]+/metalk8s-boot-cache-{variant}:"
                rf"{re.escape(version)}",
                manifest["spec"]["source"],
            ), f"unexpected source '{manifest['spec']['source']}' ({case_id})"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_PULLED], indirect=True)
def test_pull_reads_the_registry_endpoint(
    rendered_states: RenderedStates, metalk8s_versions: Any
) -> None:
    """Check a joining node pulls the worker variant over plain HTTP.

    The reference names the endpoint address, not the registry name only
    containerd resolves through its mirror configuration.
    """
    version = metalk8s_versions["images"]["metalk8s-boot-cache-worker"]["version"]
    checked = False

    for case_id, states in rendered_states:
        if PULL_STATE not in states:
            assert NO_PULL_STATE in states, f"no '{NO_PULL_STATE}' ({case_id})"
            continue

        args = _state_args(states, PULL_STATE)
        assert args["name"] == f"worker-{version.replace('.', '-')}", case_id
        # One reference per registry endpoint, so the next one is tried when
        # the first is down.
        assert isinstance(args["source"], list) and args["source"], case_id
        if "several endpoints" in case_id:
            assert len(args["source"]) == 2, case_id
        for source in args["source"]:
            assert re.fullmatch(
                rf"[0-9.]+:[0-9]+/[^/]+/metalk8s-boot-cache-worker:{re.escape(version)}",
                source,
            ), f"unexpected source '{source}' ({case_id})"
        assert args.get("plain_http") is True, f"no plain HTTP ({case_id})"
        assert args.get("timeout"), f"a pull with no timeout ({case_id})"
        assert args.get("cache_path"), f"'{PULL_STATE}' sets no cache ({case_id})"

        assert DIRECTORY_STATE in required_states(states, PULL_STATE), case_id
        assert COMMAND_STATE in required_states(states, PULL_STATE), case_id
        assert PULL_STATE in requisite_states(
            states, PULL_IMPORT_STATE, "onchanges"
        ), f"'{PULL_IMPORT_STATE}' does not watch '{PULL_STATE}' ({case_id})"
        assert TIMER_STATE in required_states(states, PULL_IMPORT_STATE), case_id

        checked = True

    assert checked, "no rendering case pulls the cache, the requisites went unchecked"


def _runs_before(states: Dict[str, Any], first: str, then: str) -> bool:
    """Tell whether one requisite, either way round, orders two states."""
    return first in requisite_states(states, then) or then in requisite_states(
        states, first, "require_in"
    )


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [DEPLOY_NODE], indirect=True)
def test_pulling_runs_before_the_kubelet_on_a_new_node(
    rendered_states: RenderedStates,
) -> None:
    """Check a node deployed for the first time holds its cache first.

    The kubelet starts in the first state that applies a role on the node:
    `Install etcd node` on an etcd node, the `highstate` otherwise. A node that
    completed a deployment before gets its new images from the image cache
    agent, so Salt runs no image cache command on it.
    """
    outcomes: Set[bool] = set()

    for case_id, states in rendered_states:
        fill_id = f"Fill the image cache on {DEPLOYED_NODE}"
        first_deploy = FIRST_DEPLOY_ONLY_CASE not in case_id
        outcomes.add(first_deploy)

        if not first_deploy:
            assert fill_id not in states, f"'{fill_id}' is declared ({case_id})"
            continue

        assert fill_id in states, f"'{fill_id}' is missing ({case_id})"
        args = _state_args(states, fill_id)
        assert args["tgt"] == DEPLOYED_NODE, case_id
        assert args["sls"] == [PULLED_SLS], case_id

        # The node may already run Pods: an older version did not record
        # the annotation.
        for earlier in ("Cordon the node", "Drain the node"):
            if earlier in states:
                assert earlier in requisite_states(
                    states, fill_id
                ), f"'{fill_id}' does not wait for '{earlier}' ({case_id})"

        for later in ("Run the highstate", "Install etcd node"):
            if later in states:
                assert _runs_before(states, fill_id, later), (
                    f"'{fill_id}' is not ordered before '{later}', the kubelet"
                    f" could start on a node whose cache is empty ({case_id})"
                )

    assert outcomes == {
        True,
        False,
    }, f"no case in `config.yaml` covers both a new node and '{FIRST_DEPLOY_ONLY_CASE}'"


@pytest.mark.formulas
@pytest.mark.parametrize(
    "template_path",
    [NODE_ROLE, BOOTSTRAP_LOCAL, Path("metalk8s/roles/bootstrap/init.sls")],
    indirect=True,
)
def test_the_highstate_runs_no_image_cache_command(
    rendered_states: RenderedStates,
) -> None:
    """Check the `highstate` leaves filling the cache to the agent.

    The `highstate` runs on every node at each upgrade. The agent stages the new
    version before the upgrade reaches the node, so a pull from Salt would at
    best do nothing, and at worst pull from a registry the node cannot reach.
    """
    for case_id, states in rendered_states:
        includes = states.get("include", [])
        for sls in (PULLED_SLS, PROVISIONED_SLS):
            assert sls not in includes, f"'{sls}' is included ({case_id})"

        for state_id, body in states.items():
            if isinstance(body, dict):
                assert not any(
                    fun.startswith("metalk8s_image_cache.") for fun in body
                ), f"'{state_id}' runs an image cache command ({case_id})"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [UPGRADE_PRE], indirect=True)
def test_the_upgrade_declares_the_target_image_cache_first(
    rendered_states: RenderedStates,
) -> None:
    """Check the agent and the target ImageCaches exist before any node moves.

    The whole agent and not only the resources: the version an upgrade comes
    from has no image cache agent, so neither the resource definition nor the
    DaemonSet exist.
    """
    for case_id, states in rendered_states:
        assert IMAGE_CACHE_ADDON in states.get(
            "include", []
        ), f"'{IMAGE_CACHE_ADDON}' is not included ({case_id})"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [UPGRADE_PRE], indirect=True)
def test_the_registry_role_lands_before_the_image_caches(
    rendered_states: RenderedStates,
) -> None:
    """Check the upgrade labels the registry role before it declares the caches.

    The image cache agent does not watch node labels. A role set after the
    ImageCache resources gets its cache only on the next periodic pass of the
    agent, and the bootstrap node of an older cluster lacks the registry role.
    """
    checked = False

    for case_id, states in rendered_states:
        for state_id in [s for s in states if s.endswith(" has the registry role")]:
            assert IMAGE_CACHE_RESOURCES_SLS in requisite_states(
                states, state_id, "require_in"
            ), f"'{state_id}' may run after the ImageCache resources ({case_id})"
            checked = True

    assert (
        checked
    ), "no rendering case labels the registry role, the order went unchecked"


def _expected_cache_names(metalk8s_versions: Any) -> Set[str]:
    """Return the names of the ImageCache resources of the current version."""
    return {
        f"{variant}-"
        + metalk8s_versions["images"][f"metalk8s-boot-cache-{variant}"][
            "version"
        ].replace(".", "-")
        for variant in VARIANTS
    }


def _check_sync_wait(
    states: Dict[str, Any],
    nodes: Dict[str, Any],
    expected_names: Set[str],
    case_id: str,
) -> bool:
    """Check the one bounded wait for the image cache of the deployed nodes.

    Return whether the case waits at all: only nodes that completed a
    deployment run an agent.
    """
    deployed = {n for n in nodes if nodes[n].get("version_applied")}
    if not deployed:
        assert WAIT_STATE not in states, f"waits with no deployed node ({case_id})"
        return False

    assert WAIT_STATE in states, f"'{WAIT_STATE}' is missing ({case_id})"
    assert IMAGE_CACHE_ADDON in requisite_states(
        states, WAIT_STATE
    ), f"'{WAIT_STATE}' does not wait for the resources ({case_id})"

    assert "salt.runner" in states[WAIT_STATE], case_id
    args = _state_args(states, WAIT_STATE)
    assert args["name"] == SYNC_CHECK, case_id
    assert set(args["node_list"]) == deployed, case_id
    # Salt runs one copy of a state per entry of `names`, with that entry as
    # its `name`: here, a runner named after each resource.
    assert "names" not in args, f"'{WAIT_STATE}' passes `names` ({case_id})"
    assert set(args["image_caches"]) == expected_names, case_id

    retry = args["retry"]
    assert (
        retry["attempts"] * retry["interval"] <= 3600
    ), f"'{WAIT_STATE}' may wait more than an hour ({case_id})"

    # Nothing touches a node before every node is synced.
    for state_id in [s for s in states if s.startswith("Best effort drain ")]:
        assert WAIT_STATE in requisite_states(
            states, state_id
        ), f"'{state_id}' runs before the image cache is synced ({case_id})"

    return True


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [UPGRADE_PRE], indirect=True)
def test_every_node_is_synced_before_the_upgrade_starts(
    environment: jinja2.Environment,
    render_contexts: Iterable[Context],
    template_path: Path,
    metalk8s_versions: Any,
) -> None:
    """Check the upgrade starts only once the agent synced every deployed node.

    Here and not before each node is deployed: etcd, the API servers and the
    engines of the bootstrap node are upgraded first. The check is bounded,
    so a node that never syncs stops the upgrade on a message naming it,
    instead of waiting forever. A node never deployed runs no agent, and
    deploying it fills its cache.
    """
    checked = False
    template = environment.get_template(str(template_path))
    expected_names = _expected_cache_names(metalk8s_versions)

    for context in render_contexts:
        states = salt.utils.yaml.safe_load(template.render(**context.data))
        if _check_sync_wait(
            states,
            context.data["pillar"]["metalk8s"]["nodes"],
            expected_names,
            context.id,
        ):
            checked = True

    assert checked, "no rendering case has a deployed node, the wait went unchecked"


def _declared_ids(
    environment: jinja2.Environment, base_context: Dict[str, Any], path: Path
) -> Set[str]:
    """Return every state ID an SLS declares, across all its rendering cases."""
    template = environment.get_template(str(path))
    ids: Set[str] = set()

    for case in config.get_cases(path):
        context = make_context(
            dict(base_context, slspath=str(path.parent)), environment, case
        )
        states = salt.utils.yaml.safe_load(template.render(**context.data))
        ids |= {key for key in states if key != "include"}

    return ids


@pytest.mark.formulas
@pytest.mark.parametrize(
    "left,right",
    [
        # The bootstrap node applies `roles.bootstrap` and, through
        # `roles.master`, `roles.node`.
        (BOOTSTRAP_LOCAL, NODE_ROLE),
        # Each way to fill the cache includes `installed.sls`.
        (IMAGE_CACHE_INSTALLED, IMAGE_CACHE_PROVISIONED),
        (IMAGE_CACHE_INSTALLED, IMAGE_CACHE_PULLED),
    ],
)
def test_no_two_sls_applied_together_share_a_state_id(
    environment: jinja2.Environment,
    base_context: Dict[str, Any],
    left: Path,
    right: Path,
) -> None:
    """Check two SLS that can land in one run declare no common state ID.

    Salt demands globally unique IDs, so the render then fails whole with
    "Detected conflicting IDs" and nothing on that node converges. The other
    tests here render one SLS at a time, which cannot see this.
    """
    shared = _declared_ids(environment, base_context, left) & _declared_ids(
        environment, base_context, right
    )

    assert not shared, (
        f"{sorted(shared)} is declared by both {left} and {right}, which can be"
        " applied in the same run"
    )


IMAGE_CACHE_API = "image-cache.scality.com/v1alpha1"
NO_PREVIOUS_CACHE_STATE = "No ImageCache of another version"
POST_UPGRADE_SLS = "metalk8s.addons.image-cache-agent.post-upgrade"
NO_FLAT_ARCHIVE_STATE = "No flat archive in the image cache"
# What Salt sets on every object it creates, along with the version label.
SALT_LABELS = {"app.kubernetes.io/managed-by": "salt"}


def _deleted_caches(states: Dict[str, Any], case_id: str) -> Set[str]:
    """Return the names of the ImageCache resources the states delete."""
    deleted = set()
    for state_id, body in states.items():
        if "metalk8s_kubernetes.object_absent" not in body:
            continue
        args = _state_args(states, state_id)
        assert args["kind"] == "ImageCache", case_id
        assert args["apiVersion"] == IMAGE_CACHE_API, case_id
        deleted.add(args["name"])
    return deleted


def _image_cache(name: str, version: str, **labels: str) -> Dict[str, Any]:
    """Return an ImageCache as Salt creates it, with extra labels."""
    return {
        "metadata": {
            "name": name,
            "labels": {
                **SALT_LABELS,
                "metalk8s.scality.com/version": version,
                **labels,
            },
        }
    }


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_POST_UPGRADE], indirect=True)
def test_the_upgrade_deletes_the_image_caches_of_other_versions(
    environment: jinja2.Environment,
    render_contexts: Iterable[Context],
    template_path: Path,
) -> None:
    """Check the post-upgrade deletes the MetalK8s ImageCache of other versions.

    The agent then removes their directories and node labels. It goes by the
    labels and not by the names, so a variant dropped since is deleted too.
    Whatever is not the current version goes, so that an interrupted or resumed
    upgrade ends in the same state.
    """
    template = environment.get_template(str(template_path))
    part_of = dict(PART_OF_METALK8S)
    checked = False

    for context in render_contexts:
        current_version = context.data["pillar"]["metalk8s"]["cluster_version"]
        current = [
            _image_cache(f"{variant}-current", current_version, **part_of)
            for variant in VARIANTS
        ]
        previous = [
            _image_cache("worker-2-6-0", "2.6.0", **part_of),
            _image_cache("etcd-2-7-0", "2.7.0", **part_of),
            # A variant the current version no longer has.
            _image_cache("dropped-2-7-0", "2.7.0", **part_of),
        ]
        # Neither a resource of another manager nor one of another product.
        foreign = [
            _image_cache("my-images-1-0-0", "2.6.0"),
            _image_cache(
                "worker-1-0-0", "2.6.0", **{"app.kubernetes.io/part-of": "other"}
            ),
        ]
        for present, expected in [
            ([], set()),
            (current, set()),
            (current + previous, {"worker-2-6-0", "etcd-2-7-0", "dropped-2-7-0"}),
        ]:
            # pylint: disable=protected-access
            context.data["salt"]._k8s.data[IMAGE_CACHE_API] = {
                "ImageCache": present + foreign
            }
            states = salt.utils.yaml.safe_load(template.render(**context.data))

            deleted = _deleted_caches(states, context.id)
            assert deleted == expected, f"deletes {sorted(deleted)} ({context.id})"
            if not expected:
                assert NO_PREVIOUS_CACHE_STATE in states, context.id
            checked = True

    assert checked, "no rendering case, the deletion went unchecked"


def _mocked_by(mock: MagicMock) -> property:
    """Return a property that stands for a mocked Salt function."""
    return property(lambda _: mock)


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [FLAT_ARCHIVES_ABSENT], indirect=True)
def test_only_flat_archives_are_removed(
    environment: jinja2.Environment,
    render_contexts: Iterable[Context],
    template_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Check the cleanup removes the archives at the root of the cache only.

    The directories under it belong to the image cache agent.
    """
    template = environment.get_template(str(template_path))
    archive = "/var/lib/image-cache/calico-node-v3.30.0.tar"
    checked = False

    for context in render_contexts:
        for found in ([], [archive]):
            find = MagicMock(return_value=found)
            monkeypatch.setattr(
                salt_fixtures.MODULE_MOCKS["file"], "find", _mocked_by(find)
            )
            states = salt.utils.yaml.safe_load(template.render(**context.data))

            find.assert_called_once_with(
                "/var/lib/image-cache", maxdepth=1, type="f", name="*.tar"
            )
            if not found:
                assert set(states) == {NO_FLAT_ARCHIVE_STATE}, context.id
                continue

            state_id = f"Remove the flat archive {archive}"
            assert set(states) == {state_id}, context.id
            assert "file.absent" in states[state_id], context.id
            assert _state_args(states, state_id)["name"] == archive, context.id
            checked = True

    assert checked, "no rendering case, the cleanup went unchecked"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [UPGRADE_POST], indirect=True)
def test_the_upgrade_cleans_the_image_cache(
    rendered_states: RenderedStates,
) -> None:
    """Check the post-upgrade deletes the old resources and archives.

    The flat archives only exist on the bootstrap node: a 134 bootstrap wrote
    them, and targeting a node that is down would fail the whole orchestrate.
    """
    cleanup_id = "Remove the flat archives from the image cache"

    for case_id, states in rendered_states:
        assert POST_UPGRADE_SLS in states.get("include", []), case_id

        args = _state_args(states, cleanup_id)
        assert args["sls"] == ["metalk8s.image-cache.flat-archives-absent"], case_id
        assert args["tgt"] == "bootstrap", case_id
