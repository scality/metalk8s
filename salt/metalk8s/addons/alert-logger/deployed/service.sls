#!metalk8s_kubernetes

apiVersion: v1
kind: Service
metadata:
  labels:
    app: metalk8s-alert-logger
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-alert-logger
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
  name: metalk8s-alert-logger
  namespace: metalk8s-monitoring
spec:
  ports:
  - port: 19094
    protocol: TCP
    targetPort: http
  selector:
    app: metalk8s-alert-logger
  type: ClusterIP
