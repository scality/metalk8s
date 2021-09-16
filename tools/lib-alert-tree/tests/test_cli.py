"""Check the generated CLI behavior."""

import textwrap
import tempfile

import click
from click.testing import CliRunner

from lib_alert_tree import cli
from lib_alert_tree.models import DerivedAlert as D, ExistingAlert as E, severity_pair

ROOT_W, ROOT_C = severity_pair(
    name="Root",
    summary_name="The root",
    warning_children=[
        E.warning("Child1", somelabel="somevalue"),
        E.critical("Child2"),
        D.warning(
            "Parent1",
            children=[E.warning("Child3"), E.warning("Child4")],
            duration="1m",
        ),
    ],
    critical_children=[E.critical("Child3"), E.critical("Child4")],
    duration="1m",
)

EXAMPLE_CLI = cli.generate_cli({"root-degraded": ROOT_W, "root-at-risk": ROOT_C})


def test_show_with_colors():
    """Check how the 'show' command works, with pretty colors."""
    # pylint: disable=line-too-long
    runner = CliRunner()
    result = runner.invoke(EXAMPLE_CLI, "show")
    assert (
        result.stdout
        == textwrap.dedent(
            f"""
            {click.style('[root]', fg=8)}
            ├── {click.style('RootAtRisk', fg='red', bold=True)}
            │   ├── {click.style('Child3', fg='red', bold=True)}
            │   └── {click.style('Child4', fg='red', bold=True)}
            └── {click.style('RootDegraded', fg='yellow', bold=True)}
                ├── {click.style('Child1', fg='yellow', bold=True)} {{somelabel = '{click.style('somevalue', bold=True)}'}}
                ├── {click.style('Child2', fg='red', bold=True)}
                └── {click.style('Parent1', fg='yellow', bold=True)}
                    ├── {click.style('Child3', fg='yellow', bold=True)}
                    └── {click.style('Child4', fg='yellow', bold=True)}

            """
        ).lstrip()
    )
    assert result.exit_code == 0


def test_show_single_root():
    """Check how the 'show' command works, when selecting a root."""
    runner = CliRunner()
    result = runner.invoke(
        EXAMPLE_CLI, ["show", "--no-pretty", "--root", "root-at-risk"]
    )
    assert (
        result.stdout
        == textwrap.dedent(
            """
            RootAtRisk{severity='critical'}
            ├── Child3{severity='critical'}
            └── Child4{severity='critical'}

            """
        ).lstrip()
    )
    assert result.exit_code == 0


def test_show_filter_alert():
    """Check how the 'show' command works, when filtering on alert name."""
    runner = CliRunner()
    result = runner.invoke(
        EXAMPLE_CLI,
        ["show", "--no-pretty", "--alert", "Parent1"],
    )
    assert (
        result.stdout
        == textwrap.dedent(
            """
            [root]
            └── Parent1{severity='warning'}
                ├── Child3{severity='warning'}
                └── Child4{severity='warning'}

            """
        ).lstrip()
    )
    assert result.exit_code == 0

    error = runner.invoke(EXAMPLE_CLI, ["show", "--no-pretty", "--alert", "NotFound"])
    assert error.stdout == (
        "Error: Failed to find an alert with name 'NotFound' in selected roots: "
        "root-degraded, root-at-risk\n"
    )
    assert error.exit_code == 1


def test_show_filter_depth():
    """Check how the 'show' command works, when controlling the tree depth."""
    runner = CliRunner()

    expected_results = {
        -1: """
        [root]
        ├── RootAtRisk{severity='critical'}
        │   ├── Child3{severity='critical'}
        │   └── Child4{severity='critical'}
        └── RootDegraded{severity='warning'}
            ├── Child1{severity='warning', somelabel=~'somevalue'}
            ├── Child2{severity='critical'}
            └── Parent1{severity='warning'}
                ├── Child3{severity='warning'}
                └── Child4{severity='warning'}

        """,
        0: """
        [root]
        ├── RootAtRisk{severity='critical'}
        └── RootDegraded{severity='warning'}

        """,
        1: """
        [root]
        ├── RootAtRisk{severity='critical'}
        │   ├── Child3{severity='critical'}
        │   └── Child4{severity='critical'}
        └── RootDegraded{severity='warning'}
            ├── Child1{severity='warning', somelabel=~'somevalue'}
            ├── Child2{severity='critical'}
            └── Parent1{severity='warning'}

        """,
        2: """
        [root]
        ├── RootAtRisk{severity='critical'}
        │   ├── Child3{severity='critical'}
        │   └── Child4{severity='critical'}
        └── RootDegraded{severity='warning'}
            ├── Child1{severity='warning', somelabel=~'somevalue'}
            ├── Child2{severity='critical'}
            └── Parent1{severity='warning'}
                ├── Child3{severity='warning'}
                └── Child4{severity='warning'}

        """,
    }

    for depth, expected_result in expected_results.items():
        result = runner.invoke(
            EXAMPLE_CLI,
            ["show", "--no-pretty", "--depth", str(depth)],
        )
        assert result.stdout == textwrap.dedent(expected_result).lstrip()
        assert result.exit_code == 0


def test_gen_rule():
    """Check how the 'gen-rule' command works."""
    # pylint: disable=line-too-long
    outfile = tempfile.mktemp(suffix=".yaml")
    runner = CliRunner()
    result = runner.invoke(
        EXAMPLE_CLI,
        ["gen-rule", "--name", "test.rules", "--namespace", "my-ns", "--out", outfile],
    )
    assert result.stdout == ""
    assert result.exit_code == 0

    with open(outfile, "r", encoding="utf-8") as handle:
        output = handle.read()

    assert (
        output
        == textwrap.dedent(
            """
        apiVersion: monitoring.coreos.com/v1
        kind: PrometheusRule
        metadata:
          labels: {}
          name: test.rules
          namespace: my-ns
        spec:
          groups:
          - name: root-degraded.rules
            rules:
            - alert: RootDegraded
              annotations:
                children: Child1{severity='warning', somelabel=~'somevalue'}, Child2{severity='critical'},
                  Parent1{severity='warning'}
                summary: The root is degraded.
              expr: (ALERTS{alertname='Child1', alertstate='firing', severity='warning', somelabel=~'somevalue'}
                or ALERTS{alertname='Child2', alertstate='firing', severity='critical'} or
                ALERTS{alertname='Parent1', alertstate='firing', severity='warning'}) >= 1
              for: 1m
              labels:
                severity: warning
            - alert: Parent1
              annotations:
                children: Child3{severity='warning'}, Child4{severity='warning'}
              expr: (ALERTS{alertname='Child3', alertstate='firing', severity='warning'} or
                ALERTS{alertname='Child4', alertstate='firing', severity='warning'}) >= 1
              for: 1m
              labels:
                severity: warning
          - name: root-at-risk.rules
            rules:
            - alert: RootAtRisk
              annotations:
                children: Child3{severity='critical'}, Child4{severity='critical'}
                summary: The root is at risk.
              expr: (ALERTS{alertname='Child3', alertstate='firing', severity='critical'}
                or ALERTS{alertname='Child4', alertstate='firing', severity='critical'}) >=
                1
              for: 1m
              labels:
                severity: critical
        """
        ).lstrip()
    )
