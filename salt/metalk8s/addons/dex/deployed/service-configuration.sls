include:
  - .namespace

{%- set dex_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-auth',
        name='metalk8s-dex-config'
  )
%}

{%- if dex_config is none %}

Create dex-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-dex-config
          namespace: metalk8s-auth
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com
            kind: DexConfig
            spec: {}

 {%- else %}

metalk8s-dex-config ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}
