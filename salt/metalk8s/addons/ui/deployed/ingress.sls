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

apiVersion: networking.k8s.io/v1beta1
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
    kubernetes.io/ingress.class: "nginx-control-plane"
spec:
  rules:
  - http:
      paths:
      - path: /api/kubernetes(/|$)(.*)
        backend:
          serviceName: kubernetes-api
          servicePort: 443
      - path: /api/salt(/|$)(.*)
        backend:
          serviceName: salt-api
          servicePort: 4507
---
apiVersion: networking.k8s.io/v1beta1
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
    kubernetes.io/ingress.class: "nginx-control-plane"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Access-Control-Allow-Origin"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/rewrite-target: '/$2'
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  rules:
  - http:
      paths:
      - path: /api/prometheus(/|$)(.*)
        backend:
          serviceName: prometheus-api
          servicePort: 9090
      - path: /api/alertmanager(/|$)(.*)
        backend:
          serviceName: alertmanager-api
          servicePort: 9093
      - path: /api/loki(/|$)(.*)
        backend:
          serviceName: loki-api
          servicePort: 3100
---
apiVersion: networking.k8s.io/v1beta1
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
    kubernetes.io/ingress.class: "nginx-control-plane"
spec:
  rules:
  - http:
      paths:
{% for path in [
    "/brand",
    "/config.json",
    "/manifest.json",
    "/shell",
    "/static",
    normalized_base_path
] %}
      - path: {{ path }}
        backend:
          serviceName: metalk8s-ui
          servicePort: 80
{% endfor %}
---
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx-control-plane
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
  rules:
  - http:
      paths:
      - path: /docs/{{ stripped_base_path }}(/|$)(.*)
        backend:
          serviceName: metalk8s-ui
          servicePort: 80
