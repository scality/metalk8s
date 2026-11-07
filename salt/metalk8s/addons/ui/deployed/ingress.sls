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

{%- set ingress_control_plane_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/nginx-ingress-control-plane/config/ingress-controller.yaml.j2', saltenv=saltenv
    )
%}

{%- set ingress_control_plane_config = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-ingress', 'metalk8s-ingress-control-plane-controller-config', ingress_control_plane_defaults
    )
%}

{%- set external_auth = ingress_control_plane_config.spec.get('externalAuth') or {} %}
{%- set external_auth_cache_duration = external_auth.get('cacheDuration', '60s') | string %}
{#- ingress-nginx skips an Ingress whose auth annotations it rejects: the routes then keep being
    served unchecked on an update, or not at all on a fresh install. Same rules as its validators. #}
{%- if external_auth.get('url') %}
  {%- if not external_auth.url | string | regex_match('^(https?://[a-zA-Z0-9][-._~a-zA-Z0-9/:,?&=]*)\\Z') %}
  {{ raise("Invalid externalAuth.url '" ~ external_auth.url ~ "', expected an http(s) URL made of letters, digits and - . _ ~ / : , ? & =") }}
  {%- endif %}
  {%- if not external_auth_cache_duration | regex_match('^([0-9]+(ms|s|m|h|d|w|M|y))\\Z') %}
  {{ raise("Invalid externalAuth.cacheDuration '" ~ external_auth_cache_duration ~ "', expected a number followed by ms, s, m, h, d, w, M or y") }}
  {%- endif %}
{%- endif %}

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
{%- if external_auth.get('url') %}
    nginx.ingress.kubernetes.io/auth-url: {{ external_auth.url | tojson }}
    nginx.ingress.kubernetes.io/auth-cache-key: "$http_authorization"
    nginx.ingress.kubernetes.io/auth-cache-duration: {{ ('200 202 401 403 ' ~ external_auth_cache_duration) | tojson }}
{%- endif %}
spec:
  ingressClassName: "nginx-control-plane"
  rules:
  - http:
      paths:
      - path: /api/prometheus(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: thanos-api
            port:
              name: http
      - path: /api/alertmanager(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: alertmanager-api
            port:
              name: http
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
