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

{%- set prometheus_ca_namespace = prometheus.spec.get('config', {}).get('oidc', {}).get('caSecret', {}).get('namespace', '') or 'metalk8s-ingress' %}
{%- set alertmanager_ca_namespace = alertmanager.spec.get('config', {}).get('oidc', {}).get('caSecret', {}).get('namespace', '') or 'metalk8s-ingress' %}

{%- if prometheus_oidc_enabled %}

Create oidc-proxy-prometheus ServiceAccount:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: oidc-proxy-prometheus
          namespace: metalk8s-monitoring

Create oidc-proxy-prometheus-secret-reader Role in {{ prometheus_ca_namespace }}:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: oidc-proxy-prometheus-secret-reader
          namespace: {{ prometheus_ca_namespace }}
        rules:
        - apiGroups: [""]
          resources: ["secrets"]
          verbs: ["get", "list", "watch"]

Create oidc-proxy-prometheus-secret-reader-binding RoleBinding in {{ prometheus_ca_namespace }}:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: oidc-proxy-prometheus-secret-reader-binding
          namespace: {{ prometheus_ca_namespace }}
        subjects:
        - kind: ServiceAccount
          name: oidc-proxy-prometheus
          namespace: metalk8s-monitoring
        roleRef:
          kind: Role
          name: oidc-proxy-prometheus-secret-reader
          apiGroup: rbac.authorization.k8s.io

Create oidc-proxy-prometheus-deployment-restarter Role:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: oidc-proxy-prometheus-deployment-restarter
          namespace: metalk8s-monitoring
        rules:
        - apiGroups: ["apps"]
          resources: ["deployments"]
          resourceNames: ["oauth2-proxy-prometheus"]
          verbs: ["get", "patch"]

Create oidc-proxy-prometheus-deployment-restarter-binding RoleBinding:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: oidc-proxy-prometheus-deployment-restarter-binding
          namespace: metalk8s-monitoring
        subjects:
        - kind: ServiceAccount
          name: oidc-proxy-prometheus
          namespace: metalk8s-monitoring
        roleRef:
          kind: Role
          name: oidc-proxy-prometheus-deployment-restarter
          apiGroup: rbac.authorization.k8s.io

{%- else %}

Ensure oidc-proxy-prometheus ServiceAccount does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-prometheus
    - namespace: metalk8s-monitoring
    - kind: ServiceAccount
    - apiVersion: v1

Ensure oidc-proxy-prometheus-secret-reader Role does not exist in {{ prometheus_ca_namespace }}:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-prometheus-secret-reader
    - namespace: {{ prometheus_ca_namespace }}
    - kind: Role
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-prometheus-secret-reader-binding RoleBinding does not exist in {{ prometheus_ca_namespace }}:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-prometheus-secret-reader-binding
    - namespace: {{ prometheus_ca_namespace }}
    - kind: RoleBinding
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-prometheus-deployment-restarter Role does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-prometheus-deployment-restarter
    - namespace: metalk8s-monitoring
    - kind: Role
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-prometheus-deployment-restarter-binding RoleBinding does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-prometheus-deployment-restarter-binding
    - namespace: metalk8s-monitoring
    - kind: RoleBinding
    - apiVersion: rbac.authorization.k8s.io/v1

{%- endif %}

{%- if alertmanager_oidc_enabled %}

Create oidc-proxy-alertmanager ServiceAccount:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: oidc-proxy-alertmanager
          namespace: metalk8s-monitoring

Create oidc-proxy-alertmanager-secret-reader Role in {{ alertmanager_ca_namespace }}:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: oidc-proxy-alertmanager-secret-reader
          namespace: {{ alertmanager_ca_namespace }}
        rules:
        - apiGroups: [""]
          resources: ["secrets"]
          verbs: ["get", "list", "watch"]

Create oidc-proxy-alertmanager-secret-reader-binding RoleBinding in {{ alertmanager_ca_namespace }}:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: oidc-proxy-alertmanager-secret-reader-binding
          namespace: {{ alertmanager_ca_namespace }}
        subjects:
        - kind: ServiceAccount
          name: oidc-proxy-alertmanager
          namespace: metalk8s-monitoring
        roleRef:
          kind: Role
          name: oidc-proxy-alertmanager-secret-reader
          apiGroup: rbac.authorization.k8s.io

Create oidc-proxy-alertmanager-deployment-restarter Role:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: oidc-proxy-alertmanager-deployment-restarter
          namespace: metalk8s-monitoring
        rules:
        - apiGroups: ["apps"]
          resources: ["deployments"]
          resourceNames: ["oauth2-proxy-alertmanager"]
          verbs: ["get", "patch"]

Create oidc-proxy-alertmanager-deployment-restarter-binding RoleBinding:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: oidc-proxy-alertmanager-deployment-restarter-binding
          namespace: metalk8s-monitoring
        subjects:
        - kind: ServiceAccount
          name: oidc-proxy-alertmanager
          namespace: metalk8s-monitoring
        roleRef:
          kind: Role
          name: oidc-proxy-alertmanager-deployment-restarter
          apiGroup: rbac.authorization.k8s.io

{%- else %}

Ensure oidc-proxy-alertmanager ServiceAccount does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-alertmanager
    - namespace: metalk8s-monitoring
    - kind: ServiceAccount
    - apiVersion: v1

Ensure oidc-proxy-alertmanager-secret-reader Role does not exist in {{ alertmanager_ca_namespace }}:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-alertmanager-secret-reader
    - namespace: {{ alertmanager_ca_namespace }}
    - kind: Role
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-alertmanager-secret-reader-binding RoleBinding does not exist in {{ alertmanager_ca_namespace }}:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-alertmanager-secret-reader-binding
    - namespace: {{ alertmanager_ca_namespace }}
    - kind: RoleBinding
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-alertmanager-deployment-restarter Role does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-alertmanager-deployment-restarter
    - namespace: metalk8s-monitoring
    - kind: Role
    - apiVersion: rbac.authorization.k8s.io/v1

Ensure oidc-proxy-alertmanager-deployment-restarter-binding RoleBinding does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oidc-proxy-alertmanager-deployment-restarter-binding
    - namespace: metalk8s-monitoring
    - kind: RoleBinding
    - apiVersion: rbac.authorization.k8s.io/v1

{%- endif %}
