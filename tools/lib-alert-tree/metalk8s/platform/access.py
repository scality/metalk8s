"""Access-related (authentication and ingress) alerts."""

from lib_alert_tree.models import DerivedAlert as Derived, Relationship
from lib_alert_tree.kubernetes import deployment_alerts, daemonset_alerts


AUTH_WARNING = Derived.warning(
    name="AuthenticationServiceDegraded",
    relationship=Relationship.ANY,
    children=[*deployment_alerts("dex", severity="warning", namespace="metalk8s-auth")],
    duration="1m",
    summary="The Authentication service for K8S API is degraded.",
)

INGRESS_WARNING = Derived.warning(
    name="IngressControllerServicesDegraded",
    relationship=Relationship.ANY,
    children=[
        *deployment_alerts(
            "ingress-nginx-defaultbackend",
            severity="warning",
            namespace="metalk8s-ingress",
        ),
        *daemonset_alerts(
            "ingress-nginx-controller",
            severity="warning",
            namespace="metalk8s-ingress",
        ),
        *daemonset_alerts(
            "ingress-nginx-control-plane-controller",
            severity="warning",
            namespace="metalk8s-ingress",
        ),
    ],
    duration="1m",
    summary=(
        "The Ingress Controllers for control plane and workload plane are degraded."
    ),
)

ACCESS_WARNING = Derived.warning(
    name="AccessServicesDegraded",
    relationship=Relationship.ANY,
    children=[AUTH_WARNING, INGRESS_WARNING],
    duration="1m",
    summary="The Access services are degraded.",
)
