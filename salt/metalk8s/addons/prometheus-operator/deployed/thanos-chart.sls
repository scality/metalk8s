#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.28.1
    helm.sh/chart: thanos-0.4.9
    heritage: metalk8s
  name: thanos-query-grpc
  namespace: metalk8s-monitoring
spec:
  clusterIP: None
  ports:
  - name: grpc
    port: 10901
    protocol: TCP
    targetPort: grpc
  selector:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/name: thanos
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.28.1
    helm.sh/chart: thanos-0.4.9
    heritage: metalk8s
  name: thanos-query-http
  namespace: metalk8s-monitoring
spec:
  ports:
  - name: http
    port: 10902
    protocol: TCP
    targetPort: http
  selector:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/name: thanos
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.28.1
    helm.sh/chart: thanos-0.4.9
    heritage: metalk8s
  name: thanos-query
  namespace: metalk8s-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/component: query
      app.kubernetes.io/instance: thanos
      app.kubernetes.io/name: thanos
  template:
    metadata:
      labels:
        app.kubernetes.io/component: query
        app.kubernetes.io/instance: thanos
        app.kubernetes.io/name: thanos
    spec:
      containers:
      - args:
        - query
        - --log.level=info
        - --log.format=logfmt
        - --grpc-address=0.0.0.0:10901
        - --http-address=0.0.0.0:10902
        - --query.replica-label=prometheus_replica
        - --query.auto-downsampling
        - --store.sd-dns-resolver=miekgdns
        - --store=dnssrv+_grpc._tcp.prometheus-operator-thanos-discovery
        - --store.sd-interval=5m
        image: {% endraw -%}{{ build_image_name("thanos", False) }}{%- raw %}:v0.35.1
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: http
        name: thanos-query
        ports:
        - containerPort: 10902
          name: http
        - containerPort: 10901
          name: grpc
        readinessProbe:
          httpGet:
            path: /-/ready
            port: http
        resources: {}
        volumeMounts: null
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes: null

{% endraw %}
