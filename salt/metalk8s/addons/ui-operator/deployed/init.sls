include:
  - .namespace
  - .manifests

Wait for the UI Operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=ui-operator, namespace=metalk8s-ui)
    - comment: Wait for the UI Operator to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.ui-operator.deployed.manifests
