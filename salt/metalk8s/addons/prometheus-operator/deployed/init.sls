include:
  - ...storageclass.deployed
  - .namespace
  - .alertmanager-configuration-secret
  - .grafana-ini-configmap
  - .dashboards
  - .service-configuration
  - .chart
  - .prometheus-rules
  - .thanos-chart

{#- Node-exporter statefulset now uses recommended labels, which are immutable,
    so we need to delete it first.
    Can be removed in development/126.0 #}

{%- set node_exporter_sts = salt.metalk8s_kubernetes.get_object(
    kind="StatefulSet",
    apiVersion="apps/v1",
    name="prometheus-operator-prometheus-node-exporter",
    namespace="metalk8s-monitoring"
) %}

{%- if node_exporter_sts and salt.pkg.version_cmp(
        node_exporter_sts["metadata"]["labels"]["metalk8s.scality.com/version"],
        "125.0.0"
    ) == -1 %}

Delete old node-exporter StatefulSet:
    metalk8s_kubernetes.object_absent:
        - apiVersion: apps/v1
        - kind: StatefulSet
        - name: prometheus-operator-prometheus-node-exporter
        - namespace: metalk8s-monitoring
        - wait:
            attempts: 30
            sleep: 10
        - require_in:
          - sls: metalk8s.addons.prometheus-operator.deployed.chart

{%- endif %}