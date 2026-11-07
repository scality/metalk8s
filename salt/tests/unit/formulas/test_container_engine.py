"""Tests for the requisites and the configuration of the container engine states.

The rendering tests only prove that a template can be rendered. Here we check the
requisites that keep a state from writing a version specific configuration when the
container engine of that version is not the one installed on the node (see MK8S-371),
and the proxy exclusions containerd is given.
"""

import re
from pathlib import Path

import pytest

from tests.unit.formulas.fixtures.rendered import RenderedStates, required_states

CONTAINERD_INSTALLED = Path("metalk8s/container-engine/containerd/installed.sls")

# Formula defining the states we depend on, it must stay in the `include` block.
REPO_FORMULA = "metalk8s.repo"

# States the containerd configuration must depend on: the package state, so the
# configuration matches the containerd actually installed, and the repository gate the
# package state itself requires.
REQUIRED_GATES = ["Install containerd", "Repositories configured"]

# States writing a version specific containerd configuration.
CONFIGURATION_STATES = ["Configure containerd", "Configure containerd registries"]

# State writing the environment of the containerd service, NO_PROXY included.
DROP_IN_STATE = "Create containerd service drop-in"

# Control plane CIDR of the base pillar, see `data/base_pillar.yaml`.
CONTROL_PLANE_CIDR = "51.68.68.0/24"

# What a NO_PROXY entry may be: a host name, an IP address or a CIDR.
NO_PROXY_ENTRY = re.compile(r"[A-Za-z0-9.:/-]+")


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [CONTAINERD_INSTALLED], indirect=True)
def test_containerd_configuration_requires_the_package(
    rendered_states: RenderedStates,
) -> None:
    """Check the containerd configuration is only written along with its package."""
    for case_id, states in rendered_states:
        assert REPO_FORMULA in states.get(
            "include", []
        ), f"'{REPO_FORMULA}' is not included, the gates cannot resolve ({case_id})"

        for state_id in CONFIGURATION_STATES:
            assert state_id in states, f"no '{state_id}' state ({case_id})"

            gates = required_states(states, state_id)
            for gate in REQUIRED_GATES:
                missing_gate = (
                    f"'{state_id}' does not require '{gate}', it would write a version"
                    " specific configuration for a container engine that is not the one"
                    " installed on the node"
                )
                assert gate in gates, f"{missing_gate} ({case_id})"


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [CONTAINERD_INSTALLED], indirect=True)
def test_containerd_no_proxy_lists_the_cluster_networks(
    rendered_states: RenderedStates,
) -> None:
    """Check containerd reaches the cluster networks without going through a proxy.

    The repositories serve the images from the control plane IPs, so a proxy that
    cannot reach them, or is not there at all, would keep every node from pulling.
    """
    for case_id, states in rendered_states:
        assert DROP_IN_STATE in states, f"no '{DROP_IN_STATE}' state ({case_id})"

        context = next(
            arg["context"]
            for arg in states[DROP_IN_STATE]["file.managed"]
            if isinstance(arg, dict) and "context" in arg
        )
        no_proxy = context["environment"]["NO_PROXY"].split(",")

        for entry in no_proxy:
            assert NO_PROXY_ENTRY.fullmatch(
                entry
            ), f"'{entry}' in NO_PROXY is not a host, an IP or a CIDR ({case_id})"
        assert (
            CONTROL_PLANE_CIDR in no_proxy
        ), f"the control plane CIDR is not in NO_PROXY ({case_id})"
