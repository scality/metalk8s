"""Network-related alerts."""

from lib_alert_tree.models import ExistingAlert as Existing, DerivedAlert as Derived

NETWORK_WARNING = Derived.warning(
    name="NetworkDegraded",
    children=[
        Existing.warning("NodeNetworkReceiveErrs"),
        Existing.warning("NodeHighNumberConntrackEntriesUsed"),
        Existing.warning("NodeNetworkTransmitErrs"),
        Existing.warning("NodeNetworkInterfaceFlapping"),
    ],
    summary="The network is degraded.",
    duration="1m",
)
