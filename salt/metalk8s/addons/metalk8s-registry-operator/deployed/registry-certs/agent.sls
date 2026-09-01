#!jinja | metalk8s_kubernetes

# Root CA whose ClusterIssuer is referenced by Registry .spec.agent.certificateIssuerRef.
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: metalk8s-registry-agent-ca
  namespace: cert-manager
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  isCA: true
  commonName: metalk8s-registry-agent-ca
  secretName: metalk8s-registry-agent-ca
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: metalk8s-registry-selfsigned-bootstrap
    kind: ClusterIssuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: metalk8s-registry-agent-ca
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  ca:
    secretName: metalk8s-registry-agent-ca
