include:
  - .chart

Wait for the Catalogd Controller Manager deployment to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=catalogd-controller-manager, namespace=olmv1-system)
    - comment: Wait for the Catalog Operator to be Ready
    - retry:
        attempts: 30
    - require:
      - test: Wait for cert-manager deployment to be Ready
      - test: Wait for cert-manager webhook to be Ready
      - test: Wait for cert-manager cainjector to be Ready
      - sls: metalk8s.addons.olm.deployed.chart

Wait for the Operator Controller Controller Manager Deployment to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=operator-controller-controller-manager, namespace=olmv1-system)
    - comment: Wait for the Operator Controller to be Ready
    - retry:
        attempts: 30
    - require:
      - test: Wait for the Catalogd Controller Manager deployment to be Ready

