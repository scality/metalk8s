include:
  - ....storageclass.deployed
  - .service-configuration
  - .loki-configuration-secret
  - .chart
  - .service
  - .datasource

{#- Due to a change of Loki StatefulSet labelSelector in 124.1.0, which is immutable field
    Manually delete the Loki StatefulSet object if it's an old one
    NOTE: This logic can be removed in `development/126.0` #}
{%- set loki_sts = salt.metalk8s_kubernetes.get_object(
    kind="StatefulSet",
    apiVersion="apps/v1",
    name="loki",
    namespace="metalk8s-logging"
) %}
{%- if loki_sts and salt.pkg.version_cmp(
        loki_sts["metadata"]["labels"]["metalk8s.scality.com/version"],
        "124.1.0"
    ) == -1 %}

Delete the old Loki StatefulSet:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: StatefulSet
    - name: loki
    - namespace: metalk8s-logging
    - wait:
        attempts: 30
        sleep: 10
    - require_in:
      - sls: metalk8s.addons.logging.loki.deployed.chart

{%- endif %}
