#! metalk8s_kubernetes

kind: Service
apiVersion: v1
metadata:
  name: kubernetes-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: kubernetes.default.svc.cluster.local
  ports:
    - name: https
      port: 443
---
kind: Service
apiVersion: v1
metadata:
  name: salt-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: salt-master.kube-system.svc.cluster.local
  ports:
    - name: https
      port: 4507
---
kind: Service
apiVersion: v1
metadata:
  name: thanos-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: thanos-query-http.metalk8s-monitoring.svc.cluster.local
  ports:
    - name: http
      port: 10902
---
kind: Service
apiVersion: v1
metadata:
  name: alertmanager-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: prometheus-operator-alertmanager.metalk8s-monitoring.svc.cluster.local
  ports:
    - name: http
      port: 9093
---
kind: Service
apiVersion: v1
metadata:
  name: loki-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: loki.metalk8s-logging.svc.cluster.local
  ports:
    - name: http
      port: 3100
