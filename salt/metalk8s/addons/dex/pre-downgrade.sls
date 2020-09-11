{# Convert ServiceConfig back to old format if required #}

{%- set dest_version = pillar.metalk8s.cluster_version %}
{%- if salt.pkg.version_cmp(dest_version, '2.6.0') == -1 %}

    {%- set dex_service_config = salt.metalk8s_kubernetes.get_object(
            kind='ConfigMap',
            apiVersion='v1',
            namespace='metalk8s-auth',
            name='metalk8s-dex-config'
        )
    %}
    {%- if dex_service_config is none %}

Dex ServiceConfiguration is absent, nothing to do:
  test.succeed_without_changes: []

    {%- elif 'config.yaml' not in dex_service_config.data %}

Dex ServiceConfiguration is empty, clean it up:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ConfigMap
    - name: metalk8s-dex-config
    - namespace: metalk8s-auth

    {%- else %}

        {%- set config_data = dex_service_config.data['config.yaml'] | load_yaml %}

        {%- if config_data.apiVersion == 'addons.metalk8s.scality.com/v1alpha2' %}

Convert new Dex ServiceConfiguration to old format:
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
            spec:
            {%- if 'deployment' in config_data.spec %}
              deployment:
                {{ config_data.spec.deployment | yaml(False) | indent(16) }}
            {%- endif %}

              localuserstore:
                enabled: {{ config_data.spec.config.enablePasswordDB | d('true') }}
                userlist:
                {{ config_data.spec.config.staticPasswords | yaml(False)
                                                           | indent(16) }}

            {%- if 'connectors' in config_data.spec.config %}
              connectors:
              {{ config_data.spec.config.connectors | yaml(False) | indent(14) }}
            {%- endif %}

          {# We backup the previous config, in case of issues #}
          previous-config.yaml: |-
            {{ config_data | yaml(False) | indent(12) }}

  {%- elif config_data.apiVersion == 'addons.metalk8s.scality.com' %}

Dex ServiceConfiguration already exists in expected format:
  test.succeed_without_changes: []

        {%- else %}

Dex ServiceConfiguration has unexpected format:
  test.fail_without_changes:
    - comment: Found unexpected apiVersion "{{ config_data.apiVersion }}"

        {%- endif %}

    {%- endif %}

{%- endif %}