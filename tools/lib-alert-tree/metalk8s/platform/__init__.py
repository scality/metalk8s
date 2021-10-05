"""Hierarchy of alerts for all MetalK8s services."""

from lib_alert_tree.models import Relationship, severity_pair

from .access import ACCESS_WARNING
from .core import CORE_WARNING, CORE_CRITICAL
from .observability import OBSERVABILITY_WARNING, OBSERVABILITY_CRITICAL

PLATFORM_WARNING, PLATFORM_CRITICAL = severity_pair(
    name="PlatformServices",
    summary_name="The Platform services",
    summary_plural=True,
    relationship=Relationship.ANY,
    warning_children=[ACCESS_WARNING, CORE_WARNING, OBSERVABILITY_WARNING],
    critical_children=[CORE_CRITICAL, OBSERVABILITY_CRITICAL],
    duration="1m",
)
