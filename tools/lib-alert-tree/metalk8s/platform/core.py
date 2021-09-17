"""Alerts around the Kubernetes control plane and bootstrap services."""

from lib_alert_tree.models import ExistingAlert as Existing, severity_pair
from lib_alert_tree.kubernetes import deployment_alerts, pod_alerts

K8S_CONTROL_WARNING, K8S_CONTROL_CRITICAL = severity_pair(
    name="KubernetesControlPlane",
    summary_name="The Kubernetes control plane",
    warning_children=[
        Existing.warning("KubeAPIErrorBudgetBurn"),
        Existing.warning("etcdHighNumberOfFailedGRPCRequests"),
        Existing.warning("etcdHTTPRequestsSlow"),
        Existing.warning("etcdHighCommitDurations"),
        Existing.warning("etcdHighFsyncDurations"),
        Existing.warning("etcdHighNumberOfFailedHTTPRequests"),
        Existing.warning("etcdHighNumberOfFailedProposals"),
        Existing.warning("etcdHighNumberOfLeaderChanges"),
        Existing.warning("etcdMemberCommunicationSlow"),
        Existing.warning("KubeCPUOvercommit"),
        Existing.warning("KubeCPUQuotaOvercommit"),
        Existing.warning("KubeMemoryOvercommit"),
        Existing.warning("KubeMemoryQuotaOvercommit"),
        Existing.warning("KubeClientCertificateExpiration"),
        Existing.warning("KubeClientErrors"),
        Existing.warning("KubeVersionMismatch"),
        *deployment_alerts("coredns", severity="warning", namespace="kube-system"),
        *deployment_alerts(
            "prometheus-adapter", severity="warning", namespace="metalk8s-monitoring"
        ),
        *deployment_alerts(
            "prometheus-operator-kube-state-metrics",
            severity="warning",
            namespace="metalk8s-monitoring",
        ),
    ],
    critical_children=[
        Existing.critical("KubeAPIErrorBudgetBurn"),
        Existing.critical("etcdHighNumberOfFailedGRPCRequests"),
        Existing.critical("etcdGRPCRequestsSlow"),
        Existing.critical("etcdHighNumberOfFailedHTTPRequests"),
        Existing.critical("etcdInsufficientMembers"),
        Existing.critical("etcdMembersDown"),
        Existing.critical("etcdNoLeader"),
        Existing.critical("KubeStateMetricsListErrors"),
        Existing.critical("KubeStateMetricsWatchErrors"),
        Existing.critical("KubeAPIDown"),
        Existing.critical("KubeClientCertificateExpiration"),
        Existing.critical("KubeControllerManagerDown"),
        Existing.critical("KubeletDown"),
        Existing.critical("KubeSchedulerDown"),
    ],
    duration="1m",
)

BOOTSTRAP_WARNING, _ = severity_pair(
    name="BootstrapServices",
    summary_name="The MetalK8s Bootstrap services",
    summary_plural=True,
    warning_children=[
        *pod_alerts("repositories-.*", severity="warning", namespace="kube-system"),
        *pod_alerts("salt-master-.*", severity="warning", namespace="kube-system"),
        *deployment_alerts(
            "storage-operator", severity="warning", namespace="kube-system"
        ),
        *deployment_alerts("metalk8s-ui", severity="warning", namespace="metalk8s-ui"),
    ],
    duration="1m",
)

CORE_WARNING, CORE_CRITICAL = severity_pair(
    name="CoreServices",
    summary_name="The Core services",
    summary_plural=True,
    warning_children=[K8S_CONTROL_WARNING, BOOTSTRAP_WARNING],
    critical_children=[K8S_CONTROL_CRITICAL],
    duration="1m",
)
