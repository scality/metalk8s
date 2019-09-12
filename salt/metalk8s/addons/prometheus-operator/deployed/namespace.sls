#! kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: v1
kind: Namespace
metadata:
  name: metalk8s-monitoring
  labels:
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
