{#- For the Prometheus-operator chart, after a cluster upgrade/downgrade some
    remnants of the old installation might remain such as PrometheusRules.
    This state is meant to cleanup old PrometheusRules marked with labels of
    an old Metalk8s version #}

{%- set version = pillar.metalk8s.cluster_version %}

{#- Todo: In future, we might need to provide a complete list of object kind
    and apiversions that require cleanup. For now, we only handle
    PrometheusRules #}

{%- set prometheus_rules_to_remove = salt.metalk8s_kubernetes.list_objects(
        kind="PrometheusRule",
        apiVersion="monitoring.coreos.com/v1",
        namespace="metalk8s-monitoring",
        label_selector="app.kubernetes.io/part-of=metalk8s,metalk8s.scality.com/version!=" ~ version
    ) %}

{%- if prometheus_rules_to_remove %}

{%- for prometheus_rule in prometheus_rules_to_remove %}

Delete old PrometheusRule {{ prometheus_rule['metadata']['name'] }}:
  metalk8s_kubernetes.object_absent:
    - name: {{ prometheus_rule['metadata']['name'] }}
    - namespace: {{ prometheus_rule['metadata']['namespace'] }}
    - kind: {{ prometheus_rule['kind'] }}
    - apiVersion: {{ prometheus_rule['apiVersion'] }}
    - wait:
        attempts: 10
        sleep: 10

{%- endfor %}

{%- else %}

No PrometheusRule to cleanup:
  test.succeed_without_changes: []

{%- endif %}
