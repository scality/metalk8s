#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import coredns with context %}

{%- set prometheus_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/prometheus.yaml',
        saltenv=saltenv
    )
%}

{%- set prometheus = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-prometheus-config', prometheus_defaults
    )
%}

{%- set prometheus_oidc_enabled = prometheus.spec.config.get('enable_oidc_authentication', False) %}

{%- set alertmanager_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/alertmanager.yaml',
        saltenv=saltenv
    )
%}

{%- set alertmanager = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-alertmanager-config', alertmanager_defaults
    )
%}

{%- set alertmanager_oidc_enabled = alertmanager.spec.get('config', {}).get('enable_oidc_authentication', False) %}

kind: Service
apiVersion: v1
metadata:
  name: kubernetes-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: kubernetes.default.svc.{{ coredns.cluster_domain }}
  ports:
    - name: https
      port: 443
---
kind: Service
apiVersion: v1
metadata:
  name: salt-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: salt-master.kube-system.svc.{{ coredns.cluster_domain }}
  ports:
    - name: https
      port: 4507
---
kind: Service
apiVersion: v1
metadata:
  name: thanos-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  {%- if prometheus_oidc_enabled %}
  externalName: oauth2-proxy-prometheus.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
  {%- else %}
  externalName: thanos-query-http.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
  {%- endif %}
  ports:
    - name: http
      port: 10902
---
kind: Service
apiVersion: v1
metadata:
  name: alertmanager-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  {%- if alertmanager_oidc_enabled %}
  externalName: oauth2-proxy-alertmanager.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
  {%- else %}
  externalName: prometheus-operator-alertmanager.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
  {%- endif %}
  ports:
    - name: http
      port: 9093
---
kind: Service
apiVersion: v1
metadata:
  name: loki-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: loki.metalk8s-logging.svc.{{ coredns.cluster_domain }}
  ports:
    - name: http
      port: 3100
