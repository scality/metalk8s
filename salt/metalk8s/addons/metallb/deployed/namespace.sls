#! kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: v1
kind: Namespace
metadata:
  name: metallb-system
  labels:
    app: metallb
