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
from typing import Any, Dict
import pytest

from tests.unit.formulas.fixtures.rendered import (
    RenderedStates,
    required_states,
    requisite_states,
)

IMAGE_CACHE_INSTALLED = Path("metalk8s/image-cache/installed.sls")
IMAGE_CACHE_PROVISIONED = Path("metalk8s/image-cache/provisioned.sls")
IMAGE_CACHE_PULLED = Path("metalk8s/image-cache/pulled.sls")
BOOTSTRAP_LOCAL = Path("metalk8s/roles/bootstrap/local.sls")

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
# The bootstrap node holds the control plane, etcd and workloads, so it gets
# every variant.
VARIANTS = ("worker", "control-plane", "etcd")
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
# Declared by both branches of the pull, so a role can always require it.
PULL_TERMINAL_STATE = "The worker boot cache is in place"


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
        if NO_PROVISION_STATE in states:
            # The bootstrap role requires this SLS as a whole, so its
            # no-containerd branch has to declare a state of its own.
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

        checked = True

    assert checked, "no rendering case provisions the cache, the names went unchecked"


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
        assert PULL_TERMINAL_STATE in states, f"no '{PULL_TERMINAL_STATE}' ({case_id})"
        if PULL_STATE not in states:
            continue

        args = _state_args(states, PULL_STATE)
        assert args["name"] == f"worker-{version.replace('.', '-')}", case_id
        assert re.fullmatch(
            rf"[0-9.]+:[0-9]+/[^/]+/metalk8s-boot-cache-worker:{re.escape(version)}",
            args["source"],
        ), f"unexpected source '{args['source']}' ({case_id})"
        assert args.get("plain_http") is True, f"no plain HTTP ({case_id})"
        assert args.get("cache_path"), f"'{PULL_STATE}' sets no cache ({case_id})"

        assert DIRECTORY_STATE in required_states(states, PULL_STATE), case_id
        assert PULL_STATE in requisite_states(
            states, PULL_IMPORT_STATE, "onchanges"
        ), f"'{PULL_IMPORT_STATE}' does not watch '{PULL_STATE}' ({case_id})"
        assert TIMER_STATE in required_states(states, PULL_IMPORT_STATE), case_id

        assert {PULL_STATE, PULL_IMPORT_STATE} <= required_states(
            states, PULL_TERMINAL_STATE
        ), f"'{PULL_TERMINAL_STATE}' does not wait for the pull ({case_id})"

        checked = True

    assert checked, "no rendering case pulls the cache, the requisites went unchecked"
