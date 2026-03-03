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

{%- set prometheus_oidc_enabled = prometheus.spec.config.get('enable_oidc_authentication', False) %}
{%- set alertmanager_oidc_enabled = alertmanager.spec.get('config', {}).get('enable_oidc_authentication', False) %}

{%- set oidc_enabled = prometheus_oidc_enabled or alertmanager_oidc_enabled %}

{%- set oidc_ca_namespace = prometheus.spec.config.get('oidc', {}).get('caSecret', {}).get('namespace', '') %}
{%- if not oidc_ca_namespace %}
  {%- set oidc_ca_namespace = alertmanager.spec.get('config', {}).get('oidc', {}).get('caSecret', {}).get('namespace', '') %}
{%- endif %}

{%- if oidc_enabled %}

Create oidc-proxy ServiceAccount:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: oidc-proxy
          namespace: metalk8s-monitoring

{%- if oidc_ca_namespace %}

Create oidc-proxy-secret-reader Role in {{ oidc_ca_namespace }}:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: oidc-proxy-secret-reader
          namespace: {{ oidc_ca_namespace }}
        rules:
        - apiGroups: [""]
          resources: ["secrets"]
          verbs: ["get", "list", "watch"]

Create oidc-proxy-secret-reader-binding RoleBinding in {{ oidc_ca_namespace }}:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: oidc-proxy-secret-reader-binding
          namespace: {{ oidc_ca_namespace }}
        subjects:
        - kind: ServiceAccount
          name: oidc-proxy
          namespace: metalk8s-monitoring
        roleRef:
          kind: Role
          name: oidc-proxy-secret-reader
          apiGroup: rbac.authorization.k8s.io

{%- endif %}

{%- else %}

Ensure oidc-proxy ServiceAccount does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy
    - namespace: metalk8s-monitoring
    - kind: ServiceAccount
    - apiVersion: v1

{%- if oidc_ca_namespace %}

Ensure oidc-proxy-secret-reader Role does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-secret-reader
    - namespace: {{ oidc_ca_namespace }}
    - kind: Role
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-secret-reader-binding RoleBinding does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-secret-reader-binding
    - namespace: {{ oidc_ca_namespace }}
    - kind: RoleBinding
    - apiVersion: rbac.authorization.k8s.io/v1

{%- endif %}

{%- endif %}
