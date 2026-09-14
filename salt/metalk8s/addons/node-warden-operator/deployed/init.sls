include:
  - metalk8s.addons.prometheus-operator.deployed.namespace
  - .chart
  - .policy
  - .workload-plane-alerts-rules

Ensure namespace is created before deploying node-warden-operator:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.prometheus-operator.deployed.namespace
    - require_in:
      - sls: metalk8s.addons.node-warden-operator.deployed.chart

Wait for the node-warden-operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=node-warden-operator-controller-manager, namespace=metalk8s-monitoring)
    - comment: Wait for the node-warden-operator to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.node-warden-operator.deployed.chart
    - require_in:
      - sls: metalk8s.addons.node-warden-operator.deployed.policy
