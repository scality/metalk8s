#!jinja | metalk8s_kubernetes

# Trust bundle for client mTLS on the RNA upload API. The operator resolves
# .spec.agent.authentication.mtls.caSecretRef against the registry namespace
# and reads the `ca.crt` key (see internal/controller/utils.go in the
# operator). Materialising the secret via cert-manager guarantees the key is
# present and rotated on renewal.
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: metalk8s-registry-agent-auth-ca
  namespace: metalk8s-registry
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  isCA: true
  commonName: metalk8s-registry-agent-auth-ca
  secretName: metalk8s-registry-agent-auth-ca
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: metalk8s-registry-selfsigned-bootstrap
    kind: ClusterIssuer
    group: cert-manager.io
