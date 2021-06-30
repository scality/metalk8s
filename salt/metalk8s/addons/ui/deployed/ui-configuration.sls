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

{%- set deployed_ui_apps = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-ui',
        name='deployed-ui-apps',
  )
%}

{%- if deployed_ui_apps is none %}

Create deployed-ui-apps ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: deployed-ui-apps
          namespace: metalk8s-ui
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha1
            kind: DeployedUIApps
            spec: {}


{%- else %}

deployed-ui-apps ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}

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
            apiVersion: addons.metalk8s.scality.com/v1alpha2
            kind: UIConfig
            spec: {}

{%- else %}

metalk8s-ui-config ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}

{%- if metalk8s_shell_ui_config is none %}
  {%- set metalk8s_ui_defaults = salt.slsutil.renderer(
          'salt://metalk8s/addons/ui/config/metalk8s-ui-config.yaml.j2',
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
  {%- set cp_ingress_url = salt.metalk8s_network.get_control_plane_ingress_endpoint() %}
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
            apiVersion: addons.metalk8s.scality.com/v1alpha2
            kind: ShellUIConfig
            spec:
              navbar:
                main:
                  - kind: metalk8s-ui
                    view: platform
                    groups: [metalk8s:admin]
                  - kind: metalk8s-ui
                    view: alerts
                    groups: [metalk8s:admin]
                subLogin:
                  - url: "{{ cp_ingress_url }}/docs/{{ stripped_base_path }}"
                    label:
                      en: "Documentation"
                      fr: "Documentation"
                    icon: "fas fa-clipboard-list"
                    isExternal: true
                  - url: "{{ cp_ingress_url }}/about"
                    label:
                      en: "About"
                      fr: "À propos"
                    icon: "fas fa-question-circle"
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
                    icon: "fas fa-clipboard-list"
                    isExternal: true
                  "{{ cp_ingress_url }}/about":
                    en: "About"
                    fr: "À propos"
                    icon: "fas fa-question-circle"

{%- else %}

  {%- set config_data = metalk8s_shell_ui_config.data['config.yaml'] | load_yaml %}

  {%- if config_data.apiVersion == 'addons.metalk8s.scality.com/v1alpha1' %}

Convert old Metalk8s Shell UI ServiceConfiguration to new format:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-shell-ui-config
          namespace: metalk8s-ui
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha2
            kind: ShellUIConfig
            spec:
              navbar:
                main:
                  {%- if 'options' in config_data.spec %}
                    {% set main_options = [] %}
                    {% for url, entry in config_data.spec.options.main.items() %}
                      {% do main_options.append({'url': url, 'groups': entry['groups'], 'label': {'en': entry['en'], 'fr': entry['fr']}, 'order': entry['order']}) %}
                    {% endfor %}
                    {%- set sorted_main_options =main_options | sort(attribute='order') %}
                    {% for entry in sorted_main_options %}
                      {%- if entry['url'] == metalk8s_ui_url %}
                  - kind: metalk8s-ui
                    view: platform
                    groups: {{ entry['groups'] }}
                      {%- elif entry['url'] == metalk8s_ui_url + 'alerts' %}
                  - kind: metalk8s-ui
                    view: alerts
                    groups: {{ entry['groups'] }}
                      {%- else %}
                  - url: {{ entry['url'] }}
                    groups: {{ entry['groups'] }}
                    label: {{ entry['label'] }}
                      {%- endif %}
                    {% endfor %}
                  {%- else %}
                  - kind: metalk8s-ui
                    view: platform
                    groups: [metalk8s:admin]
                  - kind: metalk8s-ui
                    view: alerts
                    groups: [metalk8s:admin]
                  {%- endif %}
                subLogin:
                  - url: "{{ cp_ingress_url }}/docs/{{ stripped_base_path }}"
                    label:
                      en: "Documentation"
                      fr: "Documentation"
                    icon: "fas fa-clipboard-list"
                    isExternal: true
                  - url: "{{ cp_ingress_url }}/about"
                    label:
                      en: "About"
                      fr: "À propos"
                    icon: "fas fa-question-circle"
              {%- if 'options' in config_data.spec %}
              options:
                {{ config_data.spec.options | yaml(False) | indent(16) }}
              {%- else %}
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
                    icon: "fas fa-clipboard-list"
                    isExternal: true
                  "{{ cp_ingress_url }}/about":
                    en: "About"
                    fr: "À propos"
                    icon: "fas fa-question-circle"
              {%- endif %}

  {%- elif config_data.apiVersion == 'addons.metalk8s.scality.com/v1alpha2' %}

metalk8s-shell-ui-config ConfigMap already exist:
  test.succeed_without_changes: []

  {%- else %}

metalk8s-shell-ui-config ServiceConfiguration has unexpected format:
  test.fail_without_changes:
    - comment: Found unexpected apiVersion "{{ config_data.apiVersion }}"

  {%- endif %}

{%- endif %}
