#! kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: metalk8s-prometheus
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
provisioner: kubernetes.io/no-provisioner
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
mountOptions:
  - rw
  - discard
parameters:
  fsType: ext4
  mkfsOptions: '["-m", "0"]'
