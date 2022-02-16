include:
  - metalk8s.addons.prometheus-operator.deployed.namespace
  - .chart

{#- Due to a change of prometheus-adapter deployment labelSelector in 123.0, which is immutable field
    Manually delete the prometheus-adapter deployment object if it's an old one
    NOTE: This logic can be removed in `development/124.0` #}
{%- set pa_deploy = salt.metalk8s_kubernetes.get_object(
    kind="Deployment",
    apiVersion="apps/v1",
    name="prometheus-adapter",
    namespace="metalk8s-monitoring"
) %}
{%- if pa_deploy and salt.pkg.version_cmp(
        pa_deploy["metadata"]["labels"]["metalk8s.scality.com/version"],
        "123.0.0"
    ) == -1 %}

Delete the old prometheus-adapter deployment:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: prometheus-adapter
    - namespace: metalk8s-monitoring
    - wait:
        attempts: 30
        sleep: 10
    - require_in:
      - sls: metalk8s.addons.prometheus-adapter.deployed.chart

{%- endif %}
