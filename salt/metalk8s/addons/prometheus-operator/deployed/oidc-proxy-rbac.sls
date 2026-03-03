{%- from "metalk8s/map.jinja" import repo with context %}

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

{%- if oidc_enabled %}

Create oidc-proxy ServiceAccount:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: oidc-proxy
          namespace: metalk8s-monitoring

Create oidc-proxy-secret-reader Role:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: oidc-proxy-secret-reader
          namespace: metalk8s-ingress
        rules:
        - apiGroups: [""]
          resources: ["secrets"]
          verbs: ["get", "list", "watch"]

Create oidc-proxy-secret-reader-binding RoleBinding:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: oidc-proxy-secret-reader-binding
          namespace: metalk8s-ingress
        subjects:
        - kind: ServiceAccount
          name: oidc-proxy
          namespace: metalk8s-monitoring
        roleRef:
          kind: Role
          name: oidc-proxy-secret-reader
          apiGroup: rbac.authorization.k8s.io

{%- else %}

Ensure oidc-proxy ServiceAccount does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy
    - namespace: metalk8s-monitoring
    - kind: ServiceAccount
    - apiVersion: v1

Ensure oidc-proxy-secret-reader Role does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-secret-reader
    - namespace: metalk8s-ingress
    - kind: Role
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-secret-reader-binding RoleBinding does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-secret-reader-binding
    - namespace: metalk8s-ingress
    - kind: RoleBinding
    - apiVersion: rbac.authorization.k8s.io/v1

{%- endif %}
