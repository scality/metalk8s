#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: metalk8s-prometheus
provisioner: kubernetes.io/no-provisioner
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
mountOptions:
  - rw
parameters:
  fsType: ext4
  mkfsOptions: '["-m", "0"]'
