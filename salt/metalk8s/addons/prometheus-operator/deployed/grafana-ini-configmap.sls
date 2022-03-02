{%- set grafana_defaults = salt.slsutil.renderer(
    'salt://metalk8s/addons/prometheus-operator/config/grafana.yaml.j2',
    saltenv=saltenv,
) %}

{%- set grafana = salt.metalk8s_service_configuration.get_service_conf(
    'metalk8s-monitoring', 'metalk8s-grafana-config', grafana_defaults
) %}

Create Grafana INI Configuration ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          labels:
            app.kubernetes.io/instance: prometheus-operator
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/name: grafana
            app.kubernetes.io/part-of: metalk8s
          name: prometheus-operator-grafana
          namespace: metalk8s-monitoring
        data:
          grafana.ini: |-
{%- for key, value in grafana.spec.config["grafana.ini"].items() %}
            [{{ key }}]
  {%- for element, element_value in value.items() %}
            {{ element }} = {{ element_value }}
  {%- endfor %}
{%- endfor %}
