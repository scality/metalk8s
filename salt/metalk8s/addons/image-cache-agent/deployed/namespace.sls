#!jinja | metalk8s_kubernetes

apiVersion: v1
kind: Namespace
metadata:
  name: metalk8s-image-cache
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
    # The agent mounts a hostPath, which only the privileged level allows.
    pod-security.kubernetes.io/enforce: privileged
