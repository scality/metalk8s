include:
  - .namespace
  - .chart

Ensure namespace is created before deploying disk-management-agent:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.disk-management-agent.deployed.namespace
    - require_in:
      - sls: metalk8s.addons.disk-management-agent.deployed.chart
