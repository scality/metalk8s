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
            name: thanos-api
            port:
              number: 10902
      - path: /api/alertmanager(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: alertmanager-api
            port:
              number: 9093
      - path: /api/loki(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: loki-api
            port:
              number: 3100
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: metalk8s-ui
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/rewrite-target: /$1
spec:
  ingressClassName: "nginx-control-plane"
  rules:
  - http:
      paths:
{% for path in [
    "/(brand.*)",
    "/(config.json)",
    "/(manifest.json)",
    "/(shell.*)",
    "/(static.*)",
    "/" + stripped_base_path + "/(.well-known.*)" if stripped_base_path else "/(.well-known.*)",
    "/" + stripped_base_path + "/(static.*)" if stripped_base_path else "/(static.*)",
    "/(" + stripped_base_path + ".*)",
] %}
      - path: {{ path }}
        pathType: Prefix
        backend:
          service:
            name: metalk8s-ui
            port:
              number: 80
{% endfor %}
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
