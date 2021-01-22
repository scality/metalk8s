include:
  - .namespace

{%- set dex_service_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-auth',
        name='metalk8s-dex-config'
  )
%}

{%- if dex_service_config is none %}

Create Dex ServiceConfiguration (metalk8s-auth/metalk8s-dex-config):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-dex-config
          namespace: metalk8s-auth
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha2
            kind: DexConfig
            spec:
              config:
                staticPasswords:
                - email: "admin@metalk8s.invalid"
                  hash: "$2a$10$2b2cU8CPhOTaGrs1HRQuAueS7JTT5ZHsHSzYiFPm1leZck7Mc8T4W"
                  username: "admin"
                  userID: "08a8684b-db88-4b73-90a9-3cd1661f5466"

{%- else %}

  {%- set config_data = dex_service_config.data['config.yaml'] | load_yaml %}

  {%- if config_data.apiVersion == 'addons.metalk8s.scality.com' %}

Convert old Dex ServiceConfiguration to new format:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-dex-config
          namespace: metalk8s-auth
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha2
            kind: DexConfig
            spec:
            {%- if 'deployment' in config_data.spec %}
              deployment:
                {{ config_data.spec.deployment | yaml(False) | indent(16) }}
            {%- endif %}

              config:
            {%- if 'localuserstore' in config_data.spec %}
                enablePasswordDB: {{ config_data.spec.localuserstore.enabled }}
                staticPasswords:
                {{ config_data.spec.localuserstore.userlist | yaml(False)
                                                            | indent(16) }}
            {%- endif %}

            {%- if 'connectors' in config_data.spec %}
                connectors:
                {{ config_data.spec.connectors | yaml(False) | indent(16) }}
            {%- endif %}

          {# We backup the previous config, in case of issues #}
          previous-config.yaml: |-
            {{ config_data | yaml(False) | indent(12) }}

  {%- elif config_data.apiVersion == 'addons.metalk8s.scality.com/v1alpha2' %}

Dex ServiceConfiguration already exists in expected format:
  test.succeed_without_changes: []

  {%- else %}

Dex ServiceConfiguration has unexpected format:
  test.fail_without_changes:
    - comment: Found unexpected apiVersion "{{ config_data.apiVersion }}"

  {%- endif %}

{%- endif %}
