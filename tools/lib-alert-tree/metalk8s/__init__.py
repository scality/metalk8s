"""MetalK8s hierarchy of alerts."""

from lib_alert_tree.models import severity_pair
from lib_alert_tree.prometheus import PrometheusRule

from .network import NETWORK_WARNING
from .nodes import NODE_WARNING, NODE_CRITICAL
from .platform import PLATFORM_WARNING, PLATFORM_CRITICAL
from .volumes import VOLUME_WARNING, VOLUME_CRITICAL

CLUSTER_WARNING, CLUSTER_CRITICAL = severity_pair(
    name="Cluster",
    summary_name="The cluster",
    warning_children=[NETWORK_WARNING, NODE_WARNING, PLATFORM_WARNING, VOLUME_WARNING],
    critical_children=[NODE_CRITICAL, PLATFORM_CRITICAL, VOLUME_CRITICAL],
    duration="1m",
)
