include:
  - ...deployed.namespace

{%- set fluent_bit_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-logging',
        name='metalk8s-fluent-bit-config',
    )
%}

{%- if fluent_bit_config is none %}

Create metalk8s-fluent-bit-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-fluent-bit-config
          namespace: metalk8s-logging
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com
            kind: FluentBitConfig
            spec: {}

{%- else %}

metalk8s-fluent-bit-config ConfigMap already exists:
  test.succeed_without_changes: []

{%- endif %}
