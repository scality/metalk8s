"""Node-related (system level) alerts."""

from lib_alert_tree.models import ExistingAlert as Existing, Relationship, severity_pair

SYSTEM_PARTITION_WARNING, SYSTEM_PARTITION_CRITICAL = severity_pair(
    name="SystemPartition",
    summary_name=(
        "The system partition {{ $labels.mountpoint }} on node {{ $labels.instance }}"
    ),
    relationship=Relationship.ANY,
    warning_children=[
        Existing.warning("NodeFileDescriptorLimit"),
        Existing.warning("NodeFilesystemAlmostOutOfSpace"),
        Existing.warning("NodeFilesystemAlmostOutOfFiles"),
        Existing.warning("NodeFilesystemFilesFillingUp"),
        Existing.warning("NodeFilesystemSpaceFillingUp"),
    ],
    critical_children=[
        Existing.critical("NodeFileDescriptorLimit"),
        Existing.critical("NodeFilesystemAlmostOutOfSpace"),
        Existing.critical("NodeFilesystemAlmostOutOfFiles"),
        Existing.critical("NodeFilesystemFilesFillingUp"),
        Existing.critical("NodeFilesystemSpaceFillingUp"),
    ],
    duration="1m",
    group_by=["mountpoint", "instance"],
)

NODE_WARNING, NODE_CRITICAL = severity_pair(
    name="Node",
    summary_name="The node {{ $labels.instance }}",
    relationship=Relationship.ANY,
    warning_children=[
        Existing.warning("KubeNodeNotReady"),
        Existing.warning("KubeNodeReadinessFlapping"),
        Existing.warning("KubeNodeUnreachable"),
        Existing.warning("KubeletClientCertificateExpiration"),
        Existing.warning("KubeletClientCertificateRenewalErrors"),
        Existing.warning("KubeletPlegDurationHigh"),
        Existing.warning("KubeletPodStartUpLatencyHigh"),
        Existing.warning("KubeletServerCertificateExpiration"),
        Existing.warning("KubeletServerCertificateRenewalErrors"),
        Existing.warning("KubeletTooManyPods"),
        Existing.warning("NodeClockNotSynchronising"),
        Existing.warning("NodeClockSkewDetected"),
        Existing.warning("NodeRAIDDiskFailure"),
        Existing.warning("NodeTextFileCollectorScrapeError"),
        SYSTEM_PARTITION_WARNING,
    ],
    critical_children=[
        Existing.critical("KubeletClientCertificateExpiration"),
        Existing.critical("NodeRAIDDegraded"),
        SYSTEM_PARTITION_CRITICAL,
    ],
    duration="1m",
    group_by=["instance"],
)
