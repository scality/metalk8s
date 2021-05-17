#!metalk8s_kubernetes

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
  name: dex
  namespace: metalk8s-auth
spec:
  endpoints:
  - path: /metrics
    port: telemetry
  namespaceSelector:
    matchNames:
    - metalk8s-auth
  selector:
    matchLabels:
      app.kubernetes.io/name: dex
      app.kubernetes.io/instance: dex
      app.kubernetes.io/component: dex
