#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- raw %}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
    control-plane: controller-manager
    metalk8s.scality.com/monitor: ""
  name: metalk8s-registry-operator-controller-manager-metrics-monitor
  namespace: metalk8s-registry-system
spec:
  endpoints:
  - bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
    path: /metrics
    port: https
    scheme: https
    tlsConfig:
      ca:
        secret:
          key: ca.crt
          name: metrics-server-cert
      cert:
        secret:
          key: tls.crt
          name: metrics-server-cert
      insecureSkipVerify: false
      keySecret:
        key: tls.key
        name: metrics-server-cert
      serverName: metalk8s-registry-operator-controller-manager-metrics-service.metalk8s-registry-system.svc
  selector:
    matchLabels:
      app.kubernetes.io/name: metalk8s-registry-operator
      control-plane: controller-manager
{%- endraw %}
