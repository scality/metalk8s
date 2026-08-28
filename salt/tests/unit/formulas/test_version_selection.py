"""Tests for the node selection of the upgrade and downgrade orchestrates.

The rendering tests only prove that a template can be rendered. Here we check which
nodes those orchestrates deploy, since the version label of a node whose deployment
was interrupted runs ahead of the version that node actually runs (see MK8S-370).
"""

from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Set

import pytest

from tests.unit.formulas.fixtures.rendered import RenderedStates

UPGRADE = Path("metalk8s/orchestrate/upgrade/init.sls")
DOWNGRADE = Path("metalk8s/orchestrate/downgrade/init.sls")
DEPLOY_NODE = Path("metalk8s/orchestrate/deploy_node.sls")

# The node the test cases give a version history to.
NODE = "master-1"

# Test case name, and whether that case must deploy the node above. The names come
# from the sub-cases declared for both orchestrates in `config.yaml`.
DEPLOYED_PER_CASE: Dict[str, bool] = {
    "A node that never completed the destination version": True,
    "A node whose label ran ahead of the destination": True,
    "A node that completed a version above the destination": False,
    "A node that completed a version below the destination": False,
    "A node whose recorded version ran ahead of its label": True,
    "A node left in progress with no recorded version": True,
    "A node that already completed the destination": False,
    "A node whose label alone says the destination": True,
    "A cluster resuming an interrupted upgrade": True,
}

# Requisites naming another state, all of which must exist in the same document.
REQUISITES = (
    "require",
    "require_in",
    "onfail",
    "onfail_in",
    "onchanges",
    "onchanges_in",
    "watch",
    "watch_in",
    "prereq",
    "prereq_in",
)


def _iter_referenced_ids(state_body: Any) -> Iterator[str]:
    """Yield the state IDs a single state names in its requisites."""
    # A state declared in short form, `test.succeed_without_changes` alone, parses as
    # a string and carries no requisite.
    if not isinstance(state_body, dict):
        return

    for state_args in state_body.values():
        # A state declared without any argument renders as `None`.
        for state_arg in state_args or []:
            if not isinstance(state_arg, dict):
                continue
            for requisite, targets in state_arg.items():
                if requisite in REQUISITES:
                    yield from _iter_targets(targets)


def _iter_targets(targets: Any) -> Iterator[str]:
    """Yield the state IDs named by a single requisite."""
    for target in targets:
        # A requisite entry is a single `{module: state ID}` mapping.
        if isinstance(target, dict):
            yield from target.values()


def _must_deploy(case_id: str) -> Optional[bool]:
    """Tell whether a test case expects the node to be deployed, skipped, or is
    not about node selection at all."""
    for case_name, deployed in DEPLOYED_PER_CASE.items():
        if case_name in case_id:
            return deployed
    return None


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [UPGRADE, DOWNGRADE], indirect=True)
def test_selection_follows_the_applied_version(
    rendered_states: RenderedStates,
) -> None:
    """Check that a node is selected on the version it completed, not on its label."""
    outcomes: Set[bool] = set()

    for case_id, states in rendered_states:
        must_deploy = _must_deploy(case_id)
        if must_deploy is None:
            continue
        outcomes.add(must_deploy)

        deploy_id = f"Deploy node {NODE}"
        skip_ids: List[str] = [
            state_id for state_id in states if state_id.startswith(f"Skip node {NODE},")
        ]

        if must_deploy:
            assert deploy_id in states, f"'{deploy_id}' is missing ({case_id})"
            assert not skip_ids, f"{NODE} is skipped, it did not complete ({case_id})"
        else:
            assert skip_ids, f"{NODE} is not skipped ({case_id})"
            assert deploy_id not in states, f"'{deploy_id}' is declared ({case_id})"

    assert outcomes == {True, False}, (
        "the cases exercising node selection are gone from `config.yaml`, so this"
        " orchestrate is no longer covered for both outcomes"
    )


@pytest.mark.formulas
@pytest.mark.parametrize(
    "template_path", [UPGRADE, DOWNGRADE, DEPLOY_NODE], indirect=True
)
def test_no_requisite_on_a_missing_state(rendered_states: RenderedStates) -> None:
    """Check that no state waits on a state the orchestrate did not declare.

    Nodes are deployed one by one, each waiting on the previous one, and a skipped
    node declares no state at all. Salt fails a state whose requisite names nothing
    with "The following requisites were not found", so getting that chain wrong
    silently leaves every node after the skipped one behind.
    """
    for case_id, states in rendered_states:
        declared = set(states)

        for state_id, state_body in states.items():
            for target in _iter_referenced_ids(state_body):
                assert target in declared, (
                    f"'{state_id}' waits on '{target}', which this orchestrate does"
                    f" not declare ({case_id})"
                )


@pytest.mark.formulas
@pytest.mark.parametrize("template_path", [DEPLOY_NODE], indirect=True)
def test_the_deployment_maintains_both_annotations(
    rendered_states: RenderedStates,
) -> None:
    """Check that deploying a node is what records the version it runs.

    Every path that deploys a node goes through this orchestrate, an expansion and a
    renamed node included, so both annotations are maintained here rather than in
    the orchestrate that happens to have asked for the deployment.
    """
    for case_id, states in rendered_states:
        marker = [
            state_id
            for state_id in states
            if state_id.startswith("Mark node ")
            and " as being deployed in " in state_id
        ]
        applied = [
            state_id
            for state_id in states
            if state_id.startswith("Mark node ") and " as running " in state_id
        ]

        assert marker, f"nothing sets the in-progress annotation ({case_id})"
        assert applied, f"nothing records the version the node runs ({case_id})"

        patch = states[applied[0]]["metalk8s_kubernetes.object_updated"]
        annotations = next(
            arg["patch"]["metadata"]["annotations"]
            for arg in patch
            if isinstance(arg, dict) and "patch" in arg
        )
        in_progress = annotations["metalk8s.scality.com/version-in-progress"]
        assert in_progress is None, f"marker still set ({case_id})"
