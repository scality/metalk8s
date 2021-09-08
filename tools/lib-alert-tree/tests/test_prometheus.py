"""Check serialization of Prometheus config objects."""

import textwrap

from lib_alert_tree import prometheus


def test_serializable():
    """Check sub-classing of 'Serializable'."""

    class _Example(prometheus.Serializable):
        def serialize(self):
            return {"name": "example"}

    assert repr(_Example()) == "name: example\n"


EXAMPLE_ALERT = prometheus.AlertRule(
    name="example",
    expr="sum by (instance) (example_usage_percentage > 0.8)",
    duration="1m",
    severity="critical",
    summary="Usage of {{ $labels.instance }} is high (over 80%)",
)
EXAMPLE_ALERT_STR = """
alert: example
annotations:
  summary: Usage of {{ $labels.instance }} is high (over 80%)
expr: sum by (instance) (example_usage_percentage > 0.8)
for: 1m
labels:
  severity: critical
""".lstrip()


def test_alert_rule():
    """Check serializing an 'AlertRule'."""
    assert repr(EXAMPLE_ALERT) == EXAMPLE_ALERT_STR


EXAMPLE_GROUP = prometheus.RulesGroup("example", rules=[EXAMPLE_ALERT])
EXAMPLE_GROUP_STR = f"""
name: example
rules:
- {textwrap.indent(EXAMPLE_ALERT_STR, ' ' * 2).strip()}
""".lstrip()


def test_rules_group():
    """Check serializing a 'RulesGroup'."""
    assert repr(EXAMPLE_GROUP) == EXAMPLE_GROUP_STR


EXAMPLE_PROM_RULE = prometheus.PrometheusRule(
    "example",
    "default",
    labels={
        "app.kubernetes.io/name": "example",
        "app.kubernetes.io/part-of": "metalk8s",
        "metalk8s.scality.com/version": "2.11.0",
    },
    groups=[EXAMPLE_GROUP],
)
EXAMPLE_PROM_RULE_STR = f"""
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app.kubernetes.io/name: example
    app.kubernetes.io/part-of: metalk8s
    metalk8s.scality.com/version: 2.11.0
  name: example
  namespace: default
spec:
  groups:
  - {textwrap.indent(EXAMPLE_GROUP_STR, ' ' * 4).strip()}
""".lstrip()


def test_prometheus_rule():
    """Check serializing a 'PrometheusRule'."""
    assert repr(EXAMPLE_PROM_RULE) == EXAMPLE_PROM_RULE_STR
