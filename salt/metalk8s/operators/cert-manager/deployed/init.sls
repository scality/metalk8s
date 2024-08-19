include:
  - .subscribed

Wait for the cert-manager Operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=cert-manager, namespace=operators)
    - comment: Wait for the cert-manager Operator to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.operators.cert-manager.deployed.subscribed
