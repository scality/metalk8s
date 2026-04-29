include:
  - metalk8s.addons.cert-manager.deployed
  - .namespace
  - .chart

Ensure cert-manager is ready before deploying disk-management-agent:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.cert-manager.deployed
    - require_in:
      - sls: metalk8s.addons.disk-management-agent.deployed.chart

Ensure namespace is created before deploying disk-management-agent:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.disk-management-agent.deployed.namespace
    - require_in:
      - sls: metalk8s.addons.disk-management-agent.deployed.chart
