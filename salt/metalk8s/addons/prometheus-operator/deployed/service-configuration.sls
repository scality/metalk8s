include:
  - .namespace

{%- set grafana_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-monitoring',
        name='metalk8s-grafana-config'
  )
%}

{%- set prometheus_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-monitoring',
        name='metalk8s-prometheus-config'
  )
%}

{%- set alertmanager_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-monitoring',
        name='metalk8s-alertmanager-config',
  )
%}

{%- if grafana_config is none %}

Create grafana-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-grafana-config
          namespace: metalk8s-monitoring
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com
            kind: GrafanaConfig
            spec: {}

{%- else %}

metalk8s-grafana-config ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}

{%- if prometheus_config is none %}

Create prometheus-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-prometheus-config
          namespace: metalk8s-monitoring
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com
            kind: PrometheusConfig
            spec: {}

{%- else %}

metalk8s-prometheus-config ConfigMap already exists:
  test.succeed_without_changes: []

{%- endif %}

{%- if alertmanager_config is none %}

Create alertmanager-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-alertmanager-config
          namespace: metalk8s-monitoring
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com
            kind: AlertmanagerConfig
            spec: {}

{%- else %}

metalk8s-alertmanager-config ConfigMap already exists:
  test.succeed_without_changes: []

{%- endif %}
