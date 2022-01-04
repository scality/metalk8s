include:
  - ...storageclass.deployed
  - .namespace
  - .cleanup
  - .alertmanager-configuration-secret
  - .dashboards
  - .service-configuration
  - .chart
  - .prometheus-rules
  - .thanos-chart

{#- Due to a change of kube-state-metrics deployment labelSelector in 2.11.0, which is immutable field
    Manually delete the kube-state-metrics deployment object if it's an old one
    NOTE: This logic can be removed in `development/123.0` #}
{%- set ksm_deploy = salt.metalk8s_kubernetes.get_object(
    kind="Deployment",
    apiVersion="apps/v1",
    name="prometheus-operator-kube-state-metrics",
    namespace="metalk8s-monitoring"
) %}
{%- if ksm_deploy and salt.pkg.version_cmp(
        ksm_deploy["metadata"]["labels"]["metalk8s.scality.com/version"],
        "2.11.0"
    ) == -1 %}

Delete the old kube-state-metrics deployment:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: prometheus-operator-kube-state-metrics
    - namespace: metalk8s-monitoring
    - wait:
        attempts: 30
        sleep: 10
    - require_in:
      - sls: metalk8s.addons.prometheus-operator.deployed.chart

{%- endif %}
