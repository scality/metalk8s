#! metalk8s_kubernetes

apiVersion: v1
kind: Namespace
metadata:
  name: metalk8s-logging
  labels:
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
