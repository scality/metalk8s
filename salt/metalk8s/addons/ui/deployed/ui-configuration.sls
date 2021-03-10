include:
  - .namespace

{%- set metalk8s_ui_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-ui',
        name='metalk8s-ui-config',
  )
%}

{%- if metalk8s_ui_config is none %}

Create metalk8s-ui-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-ui-config
          namespace: metalk8s-ui
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha1
            kind: UIConfig
            spec: {}

{%- else %}

metalk8s-ui-config ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}
