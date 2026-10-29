#!jinja | metalk8s_kubernetes

# Cluster-wide self-signed root used solely to bootstrap the CA
# below. It is never referenced directly by the Registry CR.
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: metalk8s-registry-selfsigned
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: metalk8s-registry-ca
  namespace: metalk8s-certs
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  isCA: true
  commonName: metalk8s-registry-ca
  secretName: metalk8s-registry-ca
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: metalk8s-registry-selfsigned
    kind: ClusterIssuer
    group: cert-manager.io
