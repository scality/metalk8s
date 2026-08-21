include:
  - .namespace
  - .chart

Wait for Registry Operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='apps/v1', kind=Deployment,
        name="metalk8s-registry-operator-controller-manager",
        namespace="metalk8s-registry-system")
    - comment: Wait for metalk8s-registry-operator to be Ready
    - retry:
        attempts: 30
    - require:
        metalk8s.addons.metalk8s-registry-operator.deployed.chart
