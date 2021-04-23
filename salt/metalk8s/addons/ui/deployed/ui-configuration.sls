include:
  - .namespace

{%- set metalk8s_ui_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-ui',
        name='metalk8s-ui-config',
  )
%}

{%- set metalk8s_shell_ui_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-ui',
        name='metalk8s-shell-ui-config',
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

{%- if metalk8s_shell_ui_config is none %}
  {%- set metalk8s_ui_defaults = salt.slsutil.renderer(
          'salt://metalk8s/addons/ui/config/metalk8s-ui-config.yaml',
          saltenv=saltenv
      )
  %}
  {%- if metalk8s_ui_config is none %}
    {%- set metalk8s_ui = metalk8s_ui_defaults %}
  {%- else %}
    {%- set metalk8s_ui = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-ui', 'metalk8s-ui-config', metalk8s_ui_defaults
    ) %}
  {%- endif %}

  {%- set stripped_base_path = metalk8s_ui.spec.basePath.strip('/') %}
  {%- set cp_ingress_url = "https://" ~ grains.metalk8s.control_plane_ip ~ ":8443" %}
  {%- set metalk8s_ui_url = cp_ingress_url ~ '/' ~ stripped_base_path ~
                            ('/' if stripped_base_path else '') %}

Create metalk8s-shell-ui-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-shell-ui-config
          namespace: metalk8s-ui
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha1
            kind: ShellUIConfig
            spec:
              options:
                main:
                  "{{ metalk8s_ui_url }}":
                    en: "Platform"
                    fr: "Plateforme"
                    groups: [metalk8s:admin]
                    activeIfMatches: "{{ metalk8s_ui_url }}(?!alerts|docs).*"
                  "{{ metalk8s_ui_url }}alerts":
                    en: "Alerts"
                    fr: "Alertes"
                    groups: [metalk8s:admin]
                subLogin:
                  "{{ cp_ingress_url }}/docs/{{ stripped_base_path }}":
                    en: "Documentation"
                    fr: "Documentation"

{%- else %}

metalk8s-shell-ui-config ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}
