include:
  - .namespace
  - .chart
  - .resources

Ensure namespace is created before deploying image-cache-agent:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.image-cache-agent.deployed.namespace
    - require_in:
      - sls: metalk8s.addons.image-cache-agent.deployed.chart

Ensure the CRD is created before the ImageCache resources:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.image-cache-agent.deployed.chart
    - require_in:
      - sls: metalk8s.addons.image-cache-agent.deployed.resources
