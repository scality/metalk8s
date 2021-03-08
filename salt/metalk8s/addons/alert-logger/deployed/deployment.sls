#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- raw %}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metalk8s-alert-logger
  namespace: metalk8s-monitoring
  labels:
    app: metalk8s-alert-logger
    heritage: metalk8s
    app.kubernetes.io/name: metalk8s-alert-logger
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: metalk8s-alert-logger
  template:
    metadata:
      labels:
        app: metalk8s-alert-logger
        heritage: metalk8s
        app.kubernetes.io/name: metalk8s-alert-logger
        app.kubernetes.io/part-of: metalk8s
        app.kubernetes.io/managed-by: salt
    spec:
      tolerations:
      - key: "node-role.kubernetes.io/bootstrap"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/infra"
        operator: "Exists"
        effect: "NoSchedule"
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      containers:
        - name: metalk8s-alert-logger
          image: {% endraw %}{{ build_image_name('metalk8s-alert-logger') }}{% raw %}
          imagePullPolicy: IfNotPresent
          ports:
          - containerPort: 19094
            name: http
            protocol: TCP
          livenessProbe:
            httpGet:
              path: /health
              port: http
              scheme: HTTP
          readinessProbe:
            httpGet:
              path: /ready
              port: http
              scheme: HTTP
{%- endraw %}
