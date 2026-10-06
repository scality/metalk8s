#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app: cert-manager
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: cert-manager
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: cert-manager
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.17.1
    helm.sh/chart: cert-manager-v1.17.1
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
    prometheus: default
  name: cert-manager
  namespace: metalk8s-certs
spec:
  endpoints:
  - honorLabels: false
    interval: 60s
    path: /metrics
    scrapeTimeout: 30s
    targetPort: 9402
  jobLabel: cert-manager
  selector:
    matchExpressions:
    - key: app.kubernetes.io/name
      operator: In
      values:
      - cainjector
      - cert-manager
      - webhook
    - key: app.kubernetes.io/instance
      operator: In
      values:
      - cert-manager
    - key: app.kubernetes.io/component
      operator: In
      values:
      - cainjector
      - controller
      - webhook

{% endraw %}
