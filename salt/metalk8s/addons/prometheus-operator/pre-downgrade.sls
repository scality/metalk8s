{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- In MetalK8s-2.5.1 the upstream Prometheus-operator chart changed the
    MatchLabels selector for prometheus-operator-grafana Deployment
    but `selector` are immutable field so, in this case, we cannot replace
    the object we need to first remove the current one and then deploy the
    desired one. #}
{#- Only do it `if dest_version < 2.5.1` #}
{%- if salt.pkg.version_cmp(dest_version, '2.5.1') == -1 %}

Delete old prometheus-operator-grafana deployment:
  metalk8s_kubernetes.object_absent:
    - name: prometheus-operator-grafana
    - namespace: metalk8s-monitoring
    - kind: Deployment
    - apiVersion: apps/v1
    - wait:
        attempts: 10
        sleep: 10

{%- else %}

Prometheus-operator-grafana deployment already ready for downgrade:
  test.succeed_without_changes: []

{%- endif %}
