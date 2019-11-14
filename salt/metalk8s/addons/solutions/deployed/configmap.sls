#!kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: v1
kind: ConfigMap
metadata:
  name: metalk8s-solutions
  namespace: metalk8s-solutions
