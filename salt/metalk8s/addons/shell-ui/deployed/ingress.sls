#! metalk8s_kubernetes
---
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: shell-ui
  namespace: metalk8s-ui
  labels:
    app: shell-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: shell-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/rewrite-target: /shell/$2
    kubernetes.io/ingress.class: "nginx-control-plane"
spec:
  rules:
  - http:
      paths:
      - path: /shell(/|$)(.*)
        backend:
          serviceName: shell-ui
          servicePort: 80
