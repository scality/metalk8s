{#- For the Prometheus-operator chart, after a cluster upgrade/downgrade some
    remnants of the old installation might remain such as PrometheusRules.
    This state is meant to cleanup old PrometheusRules and Grafana dashboards
    marked with labels of an old Metalk8s version #}

{%- set version = pillar.metalk8s.cluster_version %}
{%- set old_obj_selector = [
        "app.kubernetes.io/part-of=metalk8s",
        "metalk8s.scality.com/version!=" ~ version,
] | join(",") %}

{%- set groups_to_cleanup = [
    {
        "apiVersion": "monitoring.coreos.com/v1",
        "kind": "PrometheusRule",
        "selector": old_obj_selector,
    },
    {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "selector": old_obj_selector ~ ",grafana_dashboard=1",
    },
] %}

{%- set ns = namespace(found_objects_to_clean=false) %}
{%- for group in groups_to_cleanup %}
  {%- set found = salt.metalk8s_kubernetes.list_objects(
          kind=group.kind,
          apiVersion=group.apiVersion,
          namespace="metalk8s-monitoring",
          label_selector=group.selector,
  ) %}

  {%- if found %}
    {%- set ns.found_objects_to_clean = true %}
    {%- for obj in found %}

Delete old {{ group.kind }} {{ obj.metadata.name }}:
  metalk8s_kubernetes.object_absent:
    - name: {{ obj.metadata.name }}
    - namespace: {{ obj.metadata.namespace }}
    - kind: {{ group.kind }}
    - apiVersion: {{ group.apiVersion }}
    - wait:
        attempts: 10
        sleep: 10

    {%- endfor %}
  {%- endif %}
{%- endfor %}

{%- if not ns.found_objects_to_clean %}

Found nothing to clean up:
  test.succeed_without_changes: []

{%- endif %}
