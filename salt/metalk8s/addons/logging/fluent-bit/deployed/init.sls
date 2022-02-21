include:
  - .configmap
  - .chart

{#- Due to a change of fluent-bit DaemonSet labelSelector in 123.0, which is immutable field
    Manually delete the fluent-bit DaemonSet object if it's an old one
    NOTE: This logic can be removed in `development/124.0` #}
{%- set fluent_ds = salt.metalk8s_kubernetes.get_object(
    kind="DaemonSet",
    apiVersion="apps/v1",
    name="fluent-bit",
    namespace="metalk8s-logging"
) %}
{%- if fluent_ds and salt.pkg.version_cmp(
        fluent_ds["metadata"]["labels"]["metalk8s.scality.com/version"],
        "123.0.0"
    ) == -1 %}

Delete the old fluent-bit DaemonSet:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: DaemonSet
    - name: fluent-bit
    - namespace: metalk8s-logging
    - wait:
        attempts: 30
        sleep: 10
    - require_in:
      - sls: metalk8s.addons.logging.fluent-bit.deployed.chart

{%- endif %}
