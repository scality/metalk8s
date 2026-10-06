include:
  - metalk8s.addons.prometheus-operator.deployed
  - .servicemonitor

# The ServiceMonitor CRD is deployed by the prometheus-operator chart
Ensure ServiceMonitor CRD is deployed before deploying cert-manager ServiceMonitor:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.prometheus-operator.deployed.chart
    - require_in:
      - sls: metalk8s.addons.cert-manager.deployed.monitoring.servicemonitor
