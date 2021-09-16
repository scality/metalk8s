"""Helpers for defining lists of alerts on usual Kubernetes objects."""

from . import models


def pod_alerts(name, severity="warning", namespace="default"):
    """Common alerts for Pods."""
    return [
        models.ExistingAlert(
            alertname, severity=severity, namespace=namespace, pod=name
        )
        for alertname in ["KubePodNotReady"]
    ]


def deployment_alerts(name, severity="warning", namespace="default"):
    """Common alerts for Deployments."""
    return [
        models.ExistingAlert(
            alertname, severity=severity, namespace=namespace, deployment=name
        )
        for alertname in [
            "KubeDeploymentReplicasMismatch",
            "KubeDeploymentGenerationMismatch",
        ]
    ]


def daemonset_alerts(name, severity="warning", namespace="default"):
    """Common alerts for DaemonSets."""
    return [
        models.ExistingAlert(
            alertname, severity=severity, namespace=namespace, daemonset=name
        )
        for alertname in [
            "KubeDaemonSetNotScheduled",
            "KubeDaemonSetMisScheduled",
            "KubeDaemonSetRolloutStuck",
        ]
    ]


def statefulset_alerts(name, severity="warning", namespace="default"):
    """Common alerts for StatefulSets."""
    return [
        models.ExistingAlert(
            alertname, severity=severity, namespace=namespace, statefulset=name
        )
        for alertname in [
            "KubeStatefulSetReplicasMismatch",
            "KubeStatefulSetGenerationMismatch",
            "KubeStatefulSetUpdateNotRolledOut",
        ]
    ]
