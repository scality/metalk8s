#! jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import coredns with context %}

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
  externalName: kubernetes.default.svc.{{ coredns.cluster_domain }}
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
  externalName: salt-master.kube-system.svc.{{ coredns.cluster_domain }}
  ports:
    - name: https
      port: 4507
---
kind: Service
apiVersion: v1
metadata:
  name: prometheus-api
  namespace: metalk8s-ui
  labels:
    app: metalk8s-ui
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metalk8s-ui
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
spec:
  type: ExternalName
  externalName: prometheus-operator-prometheus.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
  ports:
    - name: http
      port: 9090
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
  externalName: prometheus-operator-alertmanager.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
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
  externalName: loki.metalk8s-logging.svc.{{ coredns.cluster_domain }}
  ports:
    - name: http
      port: 3100
