"""Check the behavior of each model."""

import textwrap
from unittest import mock

import click
import pytest

from lib_alert_tree import models
from lib_alert_tree import prometheus


class AlertTest(models.BaseAlert):
    """Example for testing `models.BaseAlert`."""

    def __init__(self, name, **labels):
        self.name = name
        self.labels = labels

    @property
    def alert_rule(self):
        return prometheus.AlertRule(self.name, labels=self.labels)


class TestBaseAlert:
    """Check the base-class for models."""

    @staticmethod
    def test_nominal():
        """Check that we can instantiate it."""
        test_alert = AlertTest("test")
        assert test_alert.alert_rule.name == "test"
        assert test_alert.alert_rule.labels == {}

    @staticmethod
    def test_severity_modifiers():
        """Check the 'warning' and 'critical' class methods."""
        test_warning = AlertTest.warning("test")
        assert test_warning.alert_rule.labels == {"severity": "warning"}
        test_critical = AlertTest.critical("test")
        assert test_critical.alert_rule.labels == {"severity": "critical"}

    @staticmethod
    def test_repr():
        """Check the representation logic."""
        test_alert = AlertTest("test")
        assert repr(test_alert) == "AlertTest<test{}>"
        test_with_labels = AlertTest.warning("test", somelabel="somevalue")
        assert (
            repr(test_with_labels)
            == "AlertTest<test{severity='warning', somelabel=~'somevalue'}>"
        )

    @staticmethod
    def test_str():
        """Check the serialization logic."""
        test_with_labels = AlertTest.warning("test", somelabel="somevalue")
        # severity, alertname, and alertstate, if set, are using an exact match, while
        # other labels use a regex match
        assert (
            str(test_with_labels) == "test{severity='warning', somelabel=~'somevalue'}"
        )

    @staticmethod
    def test_pretty_str():
        """Check the pretty display logic."""
        test_alert = AlertTest.warning("test", somelabel="someval")

        expected_pretty = (
            f"{click.style('test', fg='yellow', bold=True)} "
            f"{{somelabel = '{click.style('someval', bold=True)}'}}"
        )
        assert test_alert.pretty_str == expected_pretty

        with mock.patch("lib_alert_tree.models.CLICK_AVAILABLE", False):
            assert (
                test_alert.pretty_str
                == "test{severity='warning', somelabel=~'someval'}"
            )


def test_existing_alert_severity_check():
    """Check how 'severity' values are verified in 'ExistingAlert'."""
    with pytest.raises(ValueError, match="Unsupported severity"):
        models.ExistingAlert("test", severity="info")

    assert (
        models.ExistingAlert("test", severity="warning").labels.get("severity")
        == "warning"
    )
    assert models.ExistingAlert("test").labels.get("severity") is None


class TestRelationship:
    """Check the 'Relationship' logic."""

    @staticmethod
    def test_all():
        """Verify the behavior of 'Relationship.ALL'."""
        assert (
            models.Relationship.ALL.build_query([models.ExistingAlert("test")])
            == "(ALERTS{alertname='test', alertstate='firing'}) >= 1"
        )
        assert models.Relationship.ALL.build_query(
            [models.ExistingAlert("test1"), models.ExistingAlert("test2")]
        ) == (
            "(ALERTS{alertname='test1', alertstate='firing'} and "
            "ALERTS{alertname='test2', alertstate='firing'}) >= 1"
        )

        assert models.Relationship.ALL.build_query(
            [models.ExistingAlert("test1"), models.ExistingAlert("test2")],
            group_by=["instance"],
        ) == (
            "sum by (instance) (ALERTS{alertname='test1', alertstate='firing'} "
            "and ALERTS{alertname='test2', alertstate='firing'}) >= 1"
        )

    @staticmethod
    def test_any():
        """Verify the behavior of 'Relationship.ANY'."""
        assert (
            models.Relationship.ANY.build_query([models.ExistingAlert("test")])
            == "(ALERTS{alertname='test', alertstate='firing'}) >= 1"
        )
        assert models.Relationship.ANY.build_query(
            [models.ExistingAlert("test1"), models.ExistingAlert("test2")]
        ) == (
            "(ALERTS{alertname='test1', alertstate='firing'} or "
            "ALERTS{alertname='test2', alertstate='firing'}) >= 1"
        )

        assert models.Relationship.ANY.build_query(
            [models.ExistingAlert("test1"), models.ExistingAlert("test2")],
            group_by=["instance"],
        ) == (
            "sum by (instance) (ALERTS{alertname='test1', alertstate='firing'} "
            "or ALERTS{alertname='test2', alertstate='firing'}) >= 1"
        )


class TestDerivedAlert:
    """Check the 'DerivedAlert' model."""

    @staticmethod
    def test_build_tree():
        """Check how trees are recursively built."""
        root = models.DerivedAlert.warning(
            "Root",
            relationship=models.Relationship.ANY,
            children=[
                models.ExistingAlert.warning("Child1"),
                models.ExistingAlert.critical("Child2"),
                models.DerivedAlert.warning(
                    "Parent1",
                    relationship=models.Relationship.ANY,
                    children=[
                        models.ExistingAlert.warning("Child3"),
                        models.ExistingAlert.warning("Child4"),
                    ],
                ),
            ],
        )

        tree = root.build_tree()
        assert (
            tree.show(stdout=False)
            == textwrap.dedent(
                """
                Root{severity='warning'}
                ├── Child1{severity='warning'}
                ├── Child2{severity='critical'}
                └── Parent1{severity='warning'}
                    ├── Child3{severity='warning'}
                    └── Child4{severity='warning'}
                """
            ).lstrip()
        )
        assert tree.get_node(tree.root).data is root

    @staticmethod
    def test_alert_rule():
        """Check how properties are passed in the 'AlertRule' data container."""
        test_alert = models.DerivedAlert.warning(
            name="Test",
            relationship=models.Relationship.ANY,
            children=[
                models.ExistingAlert.warning("Child1"),
                models.ExistingAlert.critical("Child2"),
            ],
            labels={"somelabel": "somevalue"},
            annotations={"someannotation": "othervalue"},
        )

        assert test_alert.alert_rule.name == "Test"
        assert test_alert.alert_rule.labels == {
            "somelabel": "somevalue",
            "severity": "warning",
        }
        assert test_alert.alert_rule.annotations == {
            "children": "Child1{severity='warning'}, Child2{severity='critical'}",
            "someannotation": "othervalue",
        }
        assert test_alert.alert_rule.expr == (
            "(ALERTS{alertname='Child1', alertstate='firing', severity='warning'} "
            "or ALERTS{alertname='Child2', alertstate='firing', severity='critical'}) "
            ">= 1"
        )


def test_severity_pair():
    """Check the 'severity_pair' helper behavior."""
    test_warning, test_critical = models.severity_pair(
        name="Test",
        relationship=models.Relationship.ANY,
        summary_name="The test object",
        summary_plural=False,
        warning_children=[models.ExistingAlert.warning("Child1")],
        critical_children=[models.ExistingAlert.critical("Child2")],
        labels={"somelabel": "somevalue"},
        annotations={"someannotation": "othervalue"},
    )

    assert (
        test_warning.build_tree().show(stdout=False)
        == textwrap.dedent(
            """
            TestDegraded{severity='warning', somelabel=~'somevalue'}
            └── Child1{severity='warning'}
            """
        ).lstrip()
    )
    assert test_warning.alert_rule.name == "TestDegraded"
    assert test_warning.alert_rule.labels == {
        "somelabel": "somevalue",
        "severity": "warning",
    }
    assert test_warning.alert_rule.annotations == {
        "children": "Child1{severity='warning'}",
        "someannotation": "othervalue",
        "summary": "The test object is degraded.",
    }

    assert (
        test_critical.build_tree().show(stdout=False)
        == textwrap.dedent(
            """
            TestAtRisk{severity='critical', somelabel=~'somevalue'}
            └── Child2{severity='critical'}
            """
        ).lstrip()
    )
    assert test_critical.alert_rule.name == "TestAtRisk"
    assert test_critical.alert_rule.labels == {
        "somelabel": "somevalue",
        "severity": "critical",
    }
    assert test_critical.alert_rule.annotations == {
        "children": "Child2{severity='critical'}",
        "someannotation": "othervalue",
        "summary": "The test object is at risk.",
    }
