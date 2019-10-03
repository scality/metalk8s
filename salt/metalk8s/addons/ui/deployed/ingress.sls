#!kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

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
    nginx.ingress.kubernetes.io/rewrite-target: '/$2'
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    kubernetes.io/ingress.class: "nginx-control-plane"
spec:
  rules:
  - http:
      paths:
      - path: /api/prometheus(/|$)(.*)
        backend:
          serviceName: prometheus-api
          servicePort: 9090
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
      - path: /
        backend:
          serviceName: metalk8s-ui
          servicePort: 80
