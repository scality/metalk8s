#! metalk8s_kubernetes

kind: Namespace
apiVersion: v1
metadata:
  name: metalk8s-ui
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
