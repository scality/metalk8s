{%- set prometheus_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/prometheus.yaml',
        saltenv=saltenv
    )
%}

{%- set prometheus = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-prometheus-config', prometheus_defaults
    )
%}

{%- set alertmanager_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/alertmanager.yaml',
        saltenv=saltenv
    )
%}

{%- set alertmanager = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-alertmanager-config', alertmanager_defaults
    )
%}

{%- set prometheus_oidc_enabled = prometheus.spec.get('config', {}).get('enable_oidc_authentication', False) %}
{%- set alertmanager_oidc_enabled = alertmanager.spec.get('config', {}).get('enable_oidc_authentication', False) %}

{%- if prometheus_oidc_enabled or alertmanager_oidc_enabled %}

{%- set script_content = salt['cp.get_file_str'](
        'salt://metalk8s/addons/prometheus-operator/deployed/files/restart-on-ca-change.py',
        saltenv=saltenv
    )
%}

Create oidc-proxy-restart-script ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: oidc-proxy-restart-script
          namespace: metalk8s-monitoring
          labels:
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        data:
          restart-on-ca-change.py: |-
{{ script_content | indent(12, first=True) }}

{%- else %}

Ensure oidc-proxy-restart-script ConfigMap does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-restart-script
    - namespace: metalk8s-monitoring
    - kind: ConfigMap
    - apiVersion: v1

{%- endif %}
