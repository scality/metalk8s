include:
  - ...storageclass.deployed
  - .namespace
  - .alertmanager-configuration-secret
  - .grafana-ini-configmap
  - .dashboards
  - .service-configuration
  - .chart
  - .node-alerts-rules
  - .kube-alerts-rules
  - .thanos-chart

{#- In MetalK8s 128.0 this secret has been removed
    This can be removed in `development/129.0` #}
Ensure old prometheus secret does no longer exists:
  metalk8s_kubernetes.object_absent:
    - name: prometheus-operator-prometheus
    - namespace: metalk8s-monitoring
    - apiVersion: v1
    - kind: Secret
    - require:
      - sls: metalk8s.addons.prometheus-operator.deployed.chart
