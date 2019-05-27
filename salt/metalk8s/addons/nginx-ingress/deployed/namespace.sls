#! kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: v1
kind: Namespace
metadata:
  name: nginx-ingress-system
  labels:
    app: nginx-ingress
