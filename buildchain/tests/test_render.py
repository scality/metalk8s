# coding: utf-8

"""Unit tests for the `buildchain/render` tool."""

import argparse
import sys
import unittest.mock
from pathlib import Path
from typing import Any, List, Optional

import pytest

# The render tool is run as `python3 buildchain/render`: its modules import
# each other as top-level modules.
sys.path.insert(0, str(Path(__file__).parent.parent / "render"))

# pylint: disable=wrong-import-position
import common  # type: ignore # noqa: E402
import helm  # type: ignore # noqa: E402
import kustomize  # type: ignore # noqa: E402

DEPLOYMENT = "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: operator"
SERVICE = "apiVersion: v1\nkind: Service\nmetadata:\n  name: operator"
MONITOR = (
    "apiVersion: monitoring.coreos.com/v1\nkind: ServiceMonitor\n"
    "metadata:\n  name: operator"
)
DOCUMENTS = [DEPLOYMENT, SERVICE, MONITOR]


def parse(module: Any, argv: List[str]) -> argparse.Namespace:
    """Parse a subcommand command line, as `buildchain/render` does."""
    parser = argparse.ArgumentParser()
    module.add_arguments(parser)
    common.add_arguments(parser)
    return parser.parse_args(argv)


@pytest.mark.parametrize(
    "keep,remove,expected",
    [
        (None, None, True),
        ([["ServiceMonitor", "operator"]], None, True),
        ([["Service", "operator"]], None, False),
        (None, [["ServiceMonitor", "operator"]], False),
        (None, [["Service", "operator"]], True),
        # Remove wins over keep
        ([["ServiceMonitor", "operator"]], [["ServiceMonitor", "operator"]], False),
    ],
)
def test_is_selected(
    keep: Optional[List[List[str]]], remove: Optional[List[List[str]]], expected: bool
) -> None:
    """Keep and remove options select manifests by kind and name."""
    assert common.is_selected("ServiceMonitor", "operator", keep, remove) is expected


def test_select_documents_keep() -> None:
    """Keeping a manifest drops all the others."""
    selected = kustomize.select_documents(
        DOCUMENTS, [["ServiceMonitor", "operator"]], None
    )
    assert selected == [MONITOR]


def test_select_documents_remove() -> None:
    """Removing a manifest keeps all the others, in order."""
    selected = kustomize.select_documents(
        DOCUMENTS, None, [["ServiceMonitor", "operator"]]
    )
    assert selected == [DEPLOYMENT, SERVICE]


def test_select_documents_missing() -> None:
    """A manifest that is not in the output is an error, not a silent no-op."""
    with pytest.raises(ValueError, match="ServiceMonitor/typo"):
        kustomize.select_documents(DOCUMENTS, [["ServiceMonitor", "typo"]], None)
    with pytest.raises(ValueError, match="Service/typo"):
        kustomize.select_documents(DOCUMENTS, None, [["Service", "typo"]])


def test_kustomize_render() -> None:
    """The manifests are put in the SLS template as kustomize outputs them."""
    output = "\n---\n".join(DOCUMENTS) + "\n"
    args = parse(
        kustomize, ["kustomizes/operator", "--remove-manifest", "Service", "operator"]
    )
    with unittest.mock.patch.object(
        kustomize.subprocess, "check_output", return_value=output
    ) as check_output:
        sls = kustomize.render(args)

    check_output.assert_called_once_with(
        ["kustomize", "build", "kustomizes/operator"], text=True
    )
    expected = kustomize.SlsTemplate(
        kustomize.TEMPLATE_FILE.read_text(encoding="utf-8")
    ).substitute(Manifests=f"{DEPLOYMENT}\n---\n{MONITOR}\n")
    assert sls == expected


def helm_template(argv: List[str]) -> List[str]:
    """Return the `helm template` command run for a `render helm` command line."""
    with unittest.mock.patch.object(
        helm.subprocess, "check_output", return_value=DEPLOYMENT.encode()
    ) as check_output:
        helm.render(parse(helm, argv))
    command: List[str] = check_output.call_args.args[0]
    return command


def test_helm_defaults() -> None:
    """The release name and values file default to the chart directory name."""
    command = helm_template(["charts/dex"])
    assert command[:3] == ["helm", "template", "dex"]
    assert command[command.index("--values") + 1] == "charts/dex.yaml"
    assert "charts/dex" in command


def test_helm_explicit_release_and_values() -> None:
    """The release name and values file can differ from the chart directory."""
    command = helm_template(
        [
            "charts/ingress-nginx",
            "--release",
            "ingress-nginx-control-plane",
            "--values",
            "charts/ingress-nginx-control-plane.yaml",
        ]
    )
    assert command[:3] == ["helm", "template", "ingress-nginx-control-plane"]
    assert (
        command[command.index("--values") + 1]
        == "charts/ingress-nginx-control-plane.yaml"
    )
    assert "charts/ingress-nginx" in command


def test_helm_remove_manifest() -> None:
    """Helm charts use the same manifest selection as kustomizes."""
    with unittest.mock.patch.object(
        helm.subprocess,
        "check_output",
        return_value="\n---\n".join(DOCUMENTS).encode(),
    ):
        args = parse(
            helm, ["charts/dex", "--remove-manifest", "ServiceMonitor", "operator"]
        )
        sls = helm.render(args)
    assert "kind: Deployment" in sls
    assert "kind: ServiceMonitor" not in sls
