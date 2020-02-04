#! metalk8s_kubernetes

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-operator-grafana-pvc
  namespace: metalk8s-monitoring
spec:
  storageClassName: metalk8s-prometheus
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  selector:
    matchLabels:
      app: "grafana"
