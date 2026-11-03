#!jinja | metalk8s_kubernetes

# ClusterIssuer that references the CA secret created by bootstrap.sls
# Used by both server and agent Registry components for certificate issuance
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: metalk8s-registry-ca
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  ca:
    secretName: metalk8s-registry-ca
