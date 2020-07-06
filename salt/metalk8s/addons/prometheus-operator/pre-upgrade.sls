{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- In MetalK8s-2.5.1 the upstream Prometheus-operator chart changed the
    MatchLabels selector for prometheus-operator-grafana Deployment
    but `selector` are immutable field so, in this case, we cannot replace
    the object we need to first remove the current one and then deploy the
    desired one. #}
{%- set grafana_deployment = salt.metalk8s_kubernetes.get_object(
        kind='Deployment',
        apiVersion='apps/v1',
        name='prometheus-operator-grafana',
        namespace='metalk8s-monitoring'
    ) %}

{#- Only do it `if current_version < 2.5.1` #}
{#- NOTE: If no version consider it's a 2.4.0 or 2.4.1 as version label was
    added just after. #}

{%- if grafana_deployment and
       salt.pkg.version_cmp(
          grafana_deployment.get('metadata', {}).get('labels', {}).get(
            'metalk8s.scality.com/version', '2.4.1'
          ),
          '2.5.1'
       ) == -1 %}

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

Prometheus-operator-grafana deployment already ready for upgrade:
  test.succeed_without_changes: []

{%- endif %}
