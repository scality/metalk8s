from lib_alert_tree.models import DerivedAlert as Derived
from lib_alert_tree.models import ExistingAlert as Existing
from lib_alert_tree.models import Relationship
from lib_alert_tree.models import severity_pair
from lib_alert_tree.cli import generate_cli

# Existing alerts are defined with their name and labels only.
FOO_WARNING = Existing("FooServiceTooManyErrors", severity="warning")
FOO_CRITICAL = Existing("FooServiceTooManyErrors", severity="critical")

# There are shortcuts for defining the severity.
BAR_BAZ_WARNING = Existing.warning("BarAlmostOutOfSpace", bar="baz")
BAR_BAZ_CRITICAL = Existing.critical("BarAlmostOutOfSpace", bar="baz")

# Derived alerts are built from a list of children and a relationship type.
# To be serialized into valid Prometheus configuration, some other attributes are
# required.
FOOBAR_WARNING = Derived.warning(
    "FooBarDegraded",
    relationship=Relationship.ANY,
    children=[FOO_WARNING, BAR_BAZ_WARNING],
    duration="1m",
    summary="The FooBar service is degraded.",
)
FOOBAR_CRITICAL = Derived.critical(
    "FooBarAtRisk",
    relationship=Relationship.ALL,
    children=[FOO_CRITICAL, BAR_BAZ_CRITICAL],
    duration="1m",
    summary="The FooBar service is at risk.",
)

# The above "pair" is very common, so we built a shortcut for it.
ROOT_WARNING, ROOT_CRITICAL = severity_pair(
    "Example",
    summary_name="The example app",
    relationship=Relationship.ANY,
    warning_children=[FOOBAR_WARNING, Existing.warning("QuxNotProgressing")],
    critical_children=[FOOBAR_CRITICAL, Existing.critical("QuxNotProgressing")],
    duration="5m",
)

main = generate_cli(
    roots={"warning": ROOT_WARNING, "critical": ROOT_CRITICAL},
    prometheus_rule_labels={"metalk8s.scality.com/monitor": ""},
)

if __name__ == "__main__":
    main()
