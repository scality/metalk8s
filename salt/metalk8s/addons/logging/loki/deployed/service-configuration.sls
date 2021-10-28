include:
  - ...deployed.namespace

{%- set loki_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-logging',
        name='metalk8s-loki-config',
    )
%}

{%- if loki_config is none %}

Create metalk8s-loki-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-loki-config
          namespace: metalk8s-logging
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com
            kind: LokiConfig
            spec: {}

{%- else %}

metalk8s-loki-config ConfigMap already exists:
  test.succeed_without_changes: []

{%- endif %}
