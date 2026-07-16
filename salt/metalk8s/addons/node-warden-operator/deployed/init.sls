include:
  - metalk8s.addons.prometheus-operator.deployed.namespace
  - .chart

Ensure namespace is created before deploying node-warden-operator:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.prometheus-operator.deployed.namespace
    - require_in:
      - sls: metalk8s.addons.node-warden-operator.deployed.chart
