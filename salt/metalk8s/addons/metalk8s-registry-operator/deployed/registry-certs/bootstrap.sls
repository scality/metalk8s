#!jinja | metalk8s_kubernetes

# Cluster-wide self-signed root used solely to bootstrap the per-purpose CAs
# below. It is never referenced directly by the Registry CR.
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: metalk8s-registry-selfsigned-bootstrap
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  selfSigned: {}
