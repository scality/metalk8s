"""Network-related alerts."""

from lib_alert_tree.models import (
    DerivedAlert as Derived,
    ExistingAlert as Existing,
    Relationship,
)

NETWORK_WARNING = Derived.warning(
    name="NetworkDegraded",
    relationship=Relationship.ANY,
    children=[
        Existing.warning("NodeNetworkReceiveErrs"),
        Existing.warning("NodeHighNumberConntrackEntriesUsed"),
        Existing.warning("NodeNetworkTransmitErrs"),
        Existing.warning("NodeNetworkInterfaceFlapping"),
    ],
    summary="The network is degraded.",
    duration="1m",
)

NETWORK_CRITICAL = Derived.critical(
    name="NetworkOutage",
    relationship=Relationship.ANY,
    children=[
        Existing.critical("WorkloadPlaneOutage"),
    ],
    summary="The network has a critical outage.",
    duration="1m",
)
