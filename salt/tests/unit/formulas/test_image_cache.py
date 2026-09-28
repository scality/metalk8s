"""Tests for the requisites of the image cache states.

The rendering tests only prove that a template can be rendered. Here we check the
ordering the `containerd-image-preload` timer needs: it fires as soon as it is
started, and the import it runs goes into a containerd that must already be up.

The provisioning states add an ordering of their own, on both paths in. The
first node has no registry to pull from, and a joining node must not depend on
one staying reachable, so neither lets the kubelet start before the cache holds
its archives and they have been imported.
"""

from pathlib import Path
from typing import Any, Dict, Set

import jinja2
import pytest
import salt.utils.yaml  # type: ignore

from tests.unit.formulas import config
from tests.unit.formulas.fixtures.context import make_context
from tests.unit.formulas.fixtures.rendered import (
    RenderedStates,
    required_states,
    requisite_states,
)

IMAGE_CACHE_INSTALLED = Path("metalk8s/image-cache/installed.sls")
IMAGE_CACHE_PROVISIONED = Path("metalk8s/image-cache/provisioned.sls")
IMAGE_CACHE_PULLED = Path("metalk8s/image-cache/pulled.sls")
BOOTSTRAP_LOCAL = Path("metalk8s/roles/bootstrap/local.sls")
NODE_ROLE = Path("metalk8s/roles/node/init.sls")

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
PROVISION_STATE = "Provision the boot cache"
IMPORT_STATE = "Import the boot cache archives into containerd"
KUBELET_STATE = "Ensure kubelet running"
GATE_STATE = "Ensure the image cache is filled before the kubelet starts"
PROVISIONED_SLS = "metalk8s.image-cache.provisioned"

# What the provisioning renders instead when the node runs no containerd.
NO_PROVISION_STATE = "No image cache to provision"

PULLED_SLS = "metalk8s.image-cache.pulled"


# One pull per variant, so that a node needing both keeps one marker and one
# settled answer per image rather than one for the pair.
def pull_state(variant: str) -> str:
    """Return the ID of the state pulling one boot cache variant."""
    return f"Pull the {variant} boot cache"


# What every branch declares, and the only state the node role gates on.
TERMINAL_STATE = "The boot cache this node needs is in place"

# Deliberately not GATE_STATE: the bootstrap node applies both role SLS in one
# run, and Salt refuses a state ID declared twice with different bodies.
PULL_GATE_STATE = "Ensure the image cache is pulled before the kubelet starts"

# Same reason: the two imports watch different sources, so they cannot share
# an ID either, and a node applying both paths would fail to render.
PULL_IMPORT_STATE = "Import the pulled boot cache archives into containerd"

# What the hot path renders instead, on the node whose cache came from the ISO
# and on a node running no containerd.
NO_PULL_STATE = "No boot cache to pull on the bootstrap node"
NO_CACHE_STATE = "No image cache to fill"

# And what it renders when the roles do not say which variant the node needs.
UNKNOWN_ROLES_STATE = "Cannot tell from its roles which boot cache this node needs"

# Cases whose pillar leaves the roles unusable. None may pull, and none may
# report success: guessing hands a control plane node the worker images.
DEGRADED_CASES = {
    "Nodes pillar in error",
    "Node without any role",
}

# Not degraded, and that is the point: the bootstrap orchestrate injects this
# key with a null value into the pillar it hands the highstate.
NULL_ERRORS_CASE = "Nodes pillar carrying a null _errors"

CONTROL_PLANE_IMAGE = "metalk8s-boot-cache-control-plane"
WORKER_IMAGE = "metalk8s-boot-cache-worker"

# The variant each rendering case must produce, by case name in `config.yaml`.
# Bound case by case on purpose: an assertion that only collected the variants
# seen across every case passes on an inverted selection.
# The worker variant is the baseline of every node, control plane included:
# it carries the sandbox image and the mirror configuration agent, both of
# which run everywhere. A control plane node takes the other variant on top.
EXPECTED_VARIANTS = {
    "Control plane node": {"worker", "control-plane"},
    # A Node dedicated to etcd runs the etcd static pod, which only the
    # control plane variant carries.
    "Etcd node": {"worker", "control-plane"},
    "Worker node": {"worker"},
}

VARIANT_IMAGE = {
    "control-plane": CONTROL_PLANE_IMAGE,
    "worker": WORKER_IMAGE,
}


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
@pytest.mark.parametrize("template_path", [BOOTSTRAP_LOCAL], indirect=True)
def test_provisioning_runs_before_the_kubelet(
    rendered_states: RenderedStates,
) -> None:
    """Check the cache is filled before the kubelet may start.

    In `local.sls` and not in `init.sls`: this is the SLS the early stage of
    the bootstrap applies, and the run that starts the kubelet for the first
    time. An `_in` requisite only resolves against a state in the same run.
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
        for included in (PROVISIONED_SLS, "metalk8s.kubernetes.kubelet.standalone"):
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
        if PROVISION_STATE not in states:
            # The bootstrap role requires this SLS as a whole, so its
            # no-containerd branch has to declare a state of its own.
            assert (
                NO_PROVISION_STATE in states
            ), f"no '{NO_PROVISION_STATE}' state ({case_id})"
            continue

        assert DIRECTORY_STATE in required_states(states, PROVISION_STATE), (
            f"'{PROVISION_STATE}' does not require '{DIRECTORY_STATE}', it would"
            f" write into a directory nothing created ({case_id})"
        )

        triggers = requisite_states(states, PROVISION_STATE, "onchanges_in")
        triggers |= requisite_states(states, IMPORT_STATE, "onchanges")
        assert PROVISION_STATE in triggers, (
            f"'{IMPORT_STATE}' does not watch '{PROVISION_STATE}', new archives"
            f" would wait for the next firing of the timer ({case_id})"
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
        # The bootstrap node holds `bootstrap` and `master`, so its highstate
        # applies `roles.bootstrap` and, through `roles.master`, `roles.node`.
        (BOOTSTRAP_LOCAL, NODE_ROLE),
        # Both provisioning paths reach the same node the day the bootstrap
        # node pulls too, which is what the upgrade of MK8S-167 will do.
        (IMAGE_CACHE_PROVISIONED, IMAGE_CACHE_PULLED),
        # And each path against what it includes, which is the pair that
        # broke: `Create the image cache directory` was declared by both a
        # provisioning SLS and the one it includes.
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

    Salt demands globally unique IDs, and it compares the bodies along with
    the SLS they come from, so even two identical declarations conflict. The
    render then fails whole with "Detected conflicting IDs" and nothing on
    that node converges.

    The other tests here render one SLS at a time, which cannot see this.
    """
    shared = _declared_ids(environment, base_context, left) & _declared_ids(
        environment, base_context, right
    )

    assert not shared, (
        f"{sorted(shared)} is declared by both {left} and {right}, which can be"
        " applied in the same run"
    )


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [NODE_ROLE], indirect=True)
def test_pulling_runs_before_the_kubelet(
    rendered_states: RenderedStates,
) -> None:
    """Check a joining node fills its cache before the kubelet may start.

    The registry does answer here, unlike at bootstrap, so this is not about
    being able to pull at all. It is about the node holding its own images
    before it needs them, so that a registry going away later cannot keep a
    sandbox or a static pod from coming back.
    """
    for case_id, states in rendered_states:
        assert PULL_GATE_STATE in states, f"the ordering gate is gone ({case_id})"

        waits_for = requisite_states(states, PULL_GATE_STATE)
        assert TERMINAL_STATE in waits_for, (
            f"'{PULL_GATE_STATE}' does not require '{TERMINAL_STATE}', it gates"
            f" nothing ({case_id})"
        )
        assert PULLED_SLS not in waits_for, (
            f"'{PULL_GATE_STATE}' requires '{PULLED_SLS}' whole, so the kubelet"
            " waits on its failure branch too and a highstate can no longer"
            f" restart a kubelet that is down ({case_id})"
        )

        releases = requisite_states(states, PULL_GATE_STATE, "require_in")
        assert KUBELET_STATE in releases, (
            f"'{PULL_GATE_STATE}' is not ordered before '{KUBELET_STATE}', the kubelet"
            f" could start on a node whose cache is empty ({case_id})"
        )

        includes = states.get("include", [])
        for included in (PULLED_SLS, "metalk8s.kubernetes.kubelet"):
            assert included in includes, (
                f"'{included}' is not included, the requisites of '{PULL_GATE_STATE}'"
                f" cannot resolve ({case_id})"
            )


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_PULLED], indirect=True)
def test_pull_picks_the_variant_from_the_roles(
    rendered_states: RenderedStates,
) -> None:
    """Check the image pulled follows the roles the node holds.

    Each case is bound to the variant it must produce. An assertion that only
    counted the variants seen across all cases would pass on an inverted
    selection, which gives every control plane node the worker images and
    leaves it unable to start its static pods.
    """
    seen = set()
    skipped = False

    for case_id, states in rendered_states:
        pulled = {variant for variant in VARIANT_IMAGE if pull_state(variant) in states}
        if not pulled:
            # Either the node already holds its archives, or it runs no
            # containerd. Both branches owe a state of their own, since the
            # node role requires this SLS as a whole.
            assert (
                NO_PULL_STATE in states
                or NO_CACHE_STATE in states
                or UNKNOWN_ROLES_STATE in states
            ), f"neither branch declared a state of its own ({case_id})"
            skipped = True
            continue

        assert case_id in EXPECTED_VARIANTS, (
            f"case '{case_id}' pulls an image but expects no variant, add it to"
            " EXPECTED_VARIANTS or the selection goes unchecked"
        )
        expected = EXPECTED_VARIANTS[case_id]

        assert pulled == expected, (
            f"case '{case_id}' pulls {sorted(pulled)}, and its roles call for"
            f" {sorted(expected)}"
        )

        for variant in pulled:
            declared = states[pull_state(variant)]["metalk8s_image_cache.pulled"]
            image = next(arg["image"] for arg in declared if "image" in arg)
            assert f"/{VARIANT_IMAGE[variant]}:" in image, (
                f"case '{case_id}' pulls '{image}' under the name of the"
                f" '{variant}' variant"
            )

        seen.add(case_id)

    assert (
        skipped
    ), "no rendering case leaves the cache alone, the branch went unchecked"
    assert seen == set(EXPECTED_VARIANTS), (
        "a case expecting a variant rendered no pull, so its selection went"
        f" unchecked: {sorted(set(EXPECTED_VARIANTS) - seen)}"
    )


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_PULLED], indirect=True)
def test_pull_fails_loudly_when_the_roles_are_unusable(
    rendered_states: RenderedStates,
) -> None:
    """Check an unusable roles pillar fails one state instead of guessing.

    Two ways to get this wrong. Raising in Jinja fails the render, so every
    unrelated state on the node stops converging, which is the worst moment
    for it since a degraded cluster is recovered by running a highstate.
    Defaulting is worse still: it hands a control plane node the worker
    images, reports success, and the gate then releases the kubelet.
    """
    seen = set()

    for case_id, states in rendered_states:
        if case_id not in DEGRADED_CASES:
            continue

        assert UNKNOWN_ROLES_STATE in states, (
            f"case '{case_id}' does not declare '{UNKNOWN_ROLES_STATE}', so the"
            " node either guessed a variant or reported nothing to do"
        )
        assert (
            "test.fail_without_changes" in states[UNKNOWN_ROLES_STATE]
        ), f"case '{case_id}' declares the state but does not fail on it"
        for variant in VARIANT_IMAGE:
            assert pull_state(variant) not in states, (
                f"case '{case_id}' pulls the '{variant}' variant, which its"
                " roles cannot justify"
            )

        seen.add(case_id)

    assert seen == DEGRADED_CASES, (
        "a degraded case rendered nothing to check, so its behaviour went"
        f" unverified: {sorted(DEGRADED_CASES - seen)}"
    )


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_PULLED], indirect=True)
def test_pull_ignores_a_null_errors_in_the_nodes_pillar(
    rendered_states: RenderedStates,
) -> None:
    """Check a null `_errors` is read for truth and not for presence.

    `orchestrate/bootstrap/init.sls` hands the bootstrap highstate a nodes
    pillar holding `_errors: None`. A guard testing the key alone refuses
    every fresh install, which is why the rest of the repo tests the value.
    """
    checked = False

    for case_id, states in rendered_states:
        if case_id != NULL_ERRORS_CASE:
            continue

        assert UNKNOWN_ROLES_STATE not in states, (
            "a null `_errors` is being read as an error, so the node refuses to"
            " work out its variant on a perfectly healthy pillar"
        )
        checked = True

    assert checked, f"case '{NULL_ERRORS_CASE}' is gone, the guard went unchecked"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [IMAGE_CACHE_PULLED], indirect=True)
def test_import_follows_the_pull(
    rendered_states: RenderedStates,
) -> None:
    """Check the one shot import runs on new archives, as the cold path does."""
    checked = False

    for case_id, states in rendered_states:
        pulled = [
            pull_state(variant)
            for variant in VARIANT_IMAGE
            if pull_state(variant) in states
        ]
        if not pulled:
            continue

        for pull in pulled:
            required = required_states(states, pull)
            assert DIRECTORY_STATE in required, (
                f"'{pull}' does not require '{DIRECTORY_STATE}', it would write"
                f" into a directory nothing created ({case_id})"
            )
            assert "Configure containerd registries" in required, (
                f"'{pull}' does not require the registry host configuration,"
                f" `ctr` would fail to resolve the image name ({case_id})"
            )

            triggers = requisite_states(states, pull, "onchanges_in")
            triggers |= requisite_states(states, PULL_IMPORT_STATE, "onchanges")
            assert pull in triggers, (
                f"'{PULL_IMPORT_STATE}' does not watch '{pull}', new archives"
                f" would wait for the next firing of the timer ({case_id})"
            )

        assert TIMER_STATE in required_states(states, PULL_IMPORT_STATE), (
            f"'{PULL_IMPORT_STATE}' does not require '{TIMER_STATE}', it could run"
            f" before the package it comes from is installed ({case_id})"
        )

        checked = True

    assert checked, "no rendering case pulls the cache, the requisites went unchecked"


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
