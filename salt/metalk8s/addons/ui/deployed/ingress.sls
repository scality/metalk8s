#!jinja | metalk8s_kubernetes

{%- set metalk8s_ui_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/ui/config/metalk8s-ui-config.yaml.j2', saltenv=saltenv
    )
%}

{%- set metalk8s_ui_config = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-ui', 'metalk8s-ui-config', metalk8s_ui_defaults
    )
%}

{%- set stripped_base_path = metalk8s_ui_config.spec.basePath.strip('/') %}
{%- set normalized_base_path = '/' ~ stripped_base_path %}

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

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: metalk8s-ui-proxies-https
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: '/$2'
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    # Add strict SameSite policy for Salt API
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header Set-Cookie "session_id=$cookie_session_id; SameSite=Strict; Secure; HttpOnly; Path=/";
spec:
  ingressClassName: "nginx-control-plane"
  rules:
  - http:
      paths:
      - path: /api/kubernetes(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: kubernetes-api
            port:
              number: 443
      - path: /api/salt(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: salt-api
            port:
              number: 4507
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: metalk8s-ui-proxies-http
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Access-Control-Allow-Origin"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/rewrite-target: '/$2'
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: "nginx-control-plane"
  rules:
  - http:
      paths:
      - path: /api/prometheus(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            {%- if prometheus_oidc_enabled %}
            name: oauth2-proxy
            port:
              number: 4180
            {%- else %}
            name: thanos-api
            port:
              number: 10902
            {%- endif %}
      - path: /api/alertmanager(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            {%- if alertmanager_oidc_enabled %}
            name: oauth2-proxy-alertmanager
            port:
              number: 4180
            {%- else %}
            name: alertmanager-api
            port:
              number: 9093
            {%- endif %}
      {%- if pillar.addons.loki.enabled %}
      - path: /api/loki(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: loki-api
            port:
              number: 3100
      {%- endif %}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: HTTP
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: '/docs/$2'
  labels:
    app: metalk8s-docs
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-docs
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
  name: metalk8s-docs
  namespace: metalk8s-ui
spec:
  ingressClassName: "nginx-control-plane"
  rules:
  - http:
      paths:
      - path: /docs/{{ stripped_base_path }}(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: metalk8s-ui
            port:
              number: 80
