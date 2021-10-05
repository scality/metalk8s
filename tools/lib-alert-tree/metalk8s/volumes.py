"""Volume-related alerts."""

from lib_alert_tree.models import ExistingAlert as Existing, Relationship, severity_pair

VOLUME_WARNING, VOLUME_CRITICAL = severity_pair(
    name="Volume",
    summary_name=(
        "The volume {{ $labels.persistentvolumeclaim }} in namespace "
        "{{ $labels.namespace }} on node {{ $labels.instance }}"
    ),
    relationship=Relationship.ANY,
    warning_children=[Existing.warning("KubePersistentVolumeFillingUp")],
    critical_children=[
        Existing.critical("KubePersistentVolumeFillingUp"),
        Existing.critical("KubePersistentVolumeErrors"),
    ],
    group_by=["persistentvolumeclaim", "namespace", "instance"],
    duration="1m",
)
