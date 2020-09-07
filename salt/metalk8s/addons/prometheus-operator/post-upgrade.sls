# Include here all states that should be called after upgrading

include:
  - .post-cleanup

Delete old metalk8s-prometheus StorageClass:
  metalk8s_kubernetes.object_absent:
    - apiVersion: storage.k8s.io/v1
    - kind: StorageClass
    - name: metalk8s-prometheus
