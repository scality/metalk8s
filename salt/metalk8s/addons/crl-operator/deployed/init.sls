include:
  - metalk8s.addons.cert-manager.deployed
  - .chart

Ensure cert-manager is ready before deploying crl-operator:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.cert-manager.deployed
    - require_in:
      - sls: metalk8s.addons.crl-operator.deployed.chart
