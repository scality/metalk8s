"""Alerts hierarchy for the observability services (monitoring, alerting, logging)."""

from lib_alert_tree.models import ExistingAlert as Existing, Relationship, severity_pair
from lib_alert_tree.kubernetes import (
    deployment_alerts,
    daemonset_alerts,
    statefulset_alerts,
)

MONITORING_WARNING, MONITORING_CRITICAL = severity_pair(
    name="MonitoringService",
    summary_name="The monitoring service",
    relationship=Relationship.ANY,
    warning_children=[
        Existing.warning("PrometheusLabelLimitHit"),
        Existing.warning("PrometheusTargetLimitHit"),
        Existing.warning("PrometheusTSDBReloadsFailing"),
        Existing.warning("PrometheusTSDBCompactionsFailing"),
        Existing.warning("PrometheusRemoteWriteDesiredShards"),
        Existing.warning("PrometheusOutOfOrderTimestamps"),
        Existing.warning("PrometheusNotificationQueueRunningFull"),
        Existing.warning("PrometheusNotIngestingSamples"),
        Existing.warning("PrometheusNotConnectedToAlertmanagers"),
        Existing.warning("PrometheusMissingRuleEvaluations"),
        Existing.warning("PrometheusErrorSendingAlertsToSomeAlertmanagers"),
        Existing.warning("PrometheusDuplicateTimestamps"),
        Existing.warning("PrometheusOperatorWatchErrors"),
        Existing.warning("PrometheusOperatorSyncFailed"),
        Existing.warning("PrometheusOperatorRejectedResources"),
        Existing.warning("PrometheusOperatorReconcileErrors"),
        Existing.warning("PrometheusOperatorNotReady"),
        Existing.warning("PrometheusOperatorNodeLookupErrors"),
        Existing.warning("PrometheusOperatorListErrors"),
        *statefulset_alerts(
            "prometheus-prometheus-operator-prometheus",
            severity="warning",
            namespace="metalk8s-monitoring",
        ),
        *deployment_alerts(
            "prometheus-operator-operator",
            severity="warning",
            namespace="metalk8s-monitoring",
        ),
        *daemonset_alerts(
            "prometheus-operator-prometheus-node-exporter",
            severity="warning",
            namespace="metalk8s-monitoring",
        ),
    ],
    critical_children=[
        Existing.critical("KubeStateMetricsShardingMismatch"),
        Existing.critical("KubeStateMetricsShardsMissing"),
        Existing.critical("PrometheusRuleFailures"),
        Existing.critical("PrometheusRemoteWriteBehind"),
        Existing.critical("PrometheusRemoteStorageFailures"),
        Existing.critical("PrometheusErrorSendingAlertsToAnyAlertmanager"),
        Existing.critical("PrometheusBadConfig"),
        Existing.critical("PrometheusTargetSyncFailure"),
    ],
    duration="1m",
)

ALERTING_WARNING, ALERTING_CRITICAL = severity_pair(
    name="AlertingService",
    summary_name="The alerting service",
    relationship=Relationship.ANY,
    warning_children=[
        Existing.warning("AlertmanagerFailedReload"),
        Existing.warning("AlertmanagerClusterFailedToSendAlerts"),
        Existing.warning("AlertmanagerFailedToSendAlerts"),
        *statefulset_alerts(
            "alertmanager-prometheus-operator-alertmanager",
            severity="warning",
            namespace="metalk8s-monitoring",
        ),
    ],
    critical_children=[
        Existing.critical("AlertmanagerClusterCrashlooping"),
        Existing.critical("AlertmanagerClusterDown"),
        Existing.critical("AlertmanagerClusterFailedToSendAlerts"),
        Existing.critical("AlertmanagerConfigInconsistent"),
        Existing.critical("AlertmanagerMembersInconsistent"),
        Existing.critical("AlertmanagerFailedReload"),
    ],
    duration="1m",
)

LOGGING_WARNING, _ = severity_pair(
    name="LoggingService",
    summary_name="The logging service",
    relationship=Relationship.ANY,
    warning_children=[
        *statefulset_alerts("loki", severity="warning", namespace="metalk8s-logging"),
        *daemonset_alerts(
            "fluentbit", severity="warning", namespace="metalk8s-logging"
        ),
    ],
    duration="1m",
)

DASHBOARD_WARNING, _ = severity_pair(
    name="DashboardingService",
    summary_name="The dashboarding service",
    relationship=Relationship.ANY,
    warning_children=[
        *deployment_alerts(
            "prometheus-operator-grafana",
            severity="warning",
            namespace="metalk8s-monitoring",
        ),
    ],
    duration="1m",
)

OBSERVABILITY_WARNING, OBSERVABILITY_CRITICAL = severity_pair(
    name="ObservabilityServices",
    summary_name="The observability services",
    summary_plural=True,
    relationship=Relationship.ANY,
    warning_children=[
        MONITORING_WARNING,
        ALERTING_WARNING,
        LOGGING_WARNING,
        DASHBOARD_WARNING,
    ],
    critical_children=[MONITORING_CRITICAL, ALERTING_CRITICAL],
    duration="1m",
)
