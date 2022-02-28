"""Check the Kubernetes helpers behavior."""

import textwrap

from lib_alert_tree.models import DerivedAlert as D, Relationship
from lib_alert_tree import kubernetes


def test_daemonset_alerts():
    """Check DaemonSet alerts."""
    # pylint: disable=line-too-long
    test = D.warning(
        "test",
        children=kubernetes.daemonset_alerts("my-ds", namespace="my-ns"),
        relationship=Relationship.ANY,
    )
    assert (
        test.build_tree().show(stdout=False)
        == textwrap.dedent(
            """
            test{severity='warning'}
            ├── KubeDaemonSetMisScheduled{daemonset=~'my-ds', namespace=~'my-ns', severity='warning'}
            ├── KubeDaemonSetNotScheduled{daemonset=~'my-ds', namespace=~'my-ns', severity='warning'}
            └── KubeDaemonSetRolloutStuck{daemonset=~'my-ds', namespace=~'my-ns', severity='warning'}
            """
        ).lstrip()
    )


def test_deployment_alerts():
    """Check Deployment alerts."""
    # pylint: disable=line-too-long
    test = D.warning(
        "test",
        children=kubernetes.deployment_alerts("my-deploy", namespace="my-ns"),
        relationship=Relationship.ANY,
    )
    assert (
        test.build_tree().show(stdout=False)
        == textwrap.dedent(
            """
            test{severity='warning'}
            ├── KubeDeploymentGenerationMismatch{deployment=~'my-deploy', namespace=~'my-ns', severity='warning'}
            └── KubeDeploymentReplicasMismatch{deployment=~'my-deploy', namespace=~'my-ns', severity='warning'}
            """
        ).lstrip()
    )


def test_pod_alerts():
    """Check Pod alerts."""
    # pylint: disable=line-too-long
    test = D.warning(
        "test",
        children=kubernetes.pod_alerts("my-pod", namespace="my-ns"),
        relationship=Relationship.ANY,
    )
    assert (
        test.build_tree().show(stdout=False)
        == textwrap.dedent(
            """
            test{severity='warning'}
            ├── KubePodCrashLooping{namespace=~'my-ns', pod=~'my-pod', severity='warning'}
            └── KubePodNotReady{namespace=~'my-ns', pod=~'my-pod', severity='warning'}
            """
        ).lstrip()
    )


def test_statefulset_alerts():
    """Check StatefulSet alerts."""
    # pylint: disable=line-too-long
    test = D.warning(
        "test",
        children=kubernetes.statefulset_alerts("my-sts", namespace="my-ns"),
        relationship=Relationship.ANY,
    )
    assert (
        test.build_tree().show(stdout=False)
        == textwrap.dedent(
            """
            test{severity='warning'}
            ├── KubeStatefulSetGenerationMismatch{namespace=~'my-ns', severity='warning', statefulset=~'my-sts'}
            ├── KubeStatefulSetReplicasMismatch{namespace=~'my-ns', severity='warning', statefulset=~'my-sts'}
            └── KubeStatefulSetUpdateNotRolledOut{namespace=~'my-ns', severity='warning', statefulset=~'my-sts'}
            """
        ).lstrip()
    )


def test_job_alerts():
    """Check Job alerts."""
    test = D.warning(
        "test",
        children=kubernetes.job_alerts("my-job", namespace="my-ns"),
        relationship=Relationship.ANY,
    )
    assert (
        test.build_tree().show(stdout=False)
        == textwrap.dedent(
            """
            test{severity='warning'}
            ├── KubeJobCompletion{job=~'my-job', namespace=~'my-ns', severity='warning'}
            └── KubeJobFailed{job=~'my-job', namespace=~'my-ns', severity='warning'}
            """
        ).lstrip()
    )
