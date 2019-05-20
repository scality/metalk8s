apiVersion: v1
data:
  alertmanager.yaml: Z2xvYmFsOgogIHJlc29sdmVfdGltZW91dDogNW0Kcm91dGU6CiAgZ3JvdXBfYnk6IFsnam9iJ10KICBncm91cF93YWl0OiAzMHMKICBncm91cF9pbnRlcnZhbDogNW0KICByZXBlYXRfaW50ZXJ2YWw6IDEyaAogIHJlY2VpdmVyOiAnbnVsbCcKICByb3V0ZXM6CiAgLSBtYXRjaDoKICAgICAgYWxlcnRuYW1lOiBEZWFkTWFuc1N3aXRjaAogICAgcmVjZWl2ZXI6ICdudWxsJwpyZWNlaXZlcnM6Ci0gbmFtZTogJ251bGwnCg==
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
type: Opaque
---
apiVersion: monitoring.coreos.com/v1
kind: Alertmanager
metadata:
  labels:
    alertmanager: main
  name: main
  namespace: monitoring
spec:
  baseImage: quay.io/prometheus/alertmanager
  nodeSelector:
    beta.kubernetes.io/os: linux
  replicas: 3
  serviceAccountName: alertmanager-main
  version: v0.15.2
---
apiVersion: v1
kind: Service
metadata:
  labels:
    alertmanager: main
  name: alertmanager-main
  namespace: monitoring
spec:
  ports:
  - name: web
    port: 9093
    targetPort: web
  selector:
    alertmanager: main
    app: alertmanager
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alertmanager-main
  namespace: monitoring
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    k8s-app: alertmanager
  name: alertmanager
  namespace: monitoring
spec:
  endpoints:
  - interval: 30s
    port: web
  selector:
    matchLabels:
      alertmanager: main
