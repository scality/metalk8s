#!jinja | metalk8s_kubernetes

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backup-replication
  namespace: kube-system
  labels:
    app.kubernetes.io/name: backup
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: backup
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: backup-replication
    ports:
    - protocol: TCP
      port: 443
