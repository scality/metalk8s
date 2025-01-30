include:
  - .namespace
  - .chart

Wait for cert-manager deployment to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=cert-manager, namespace=metalk8s-certs)
    - comment: wait for cert-manager
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.cert-manager.deployed.chart

Wait for cert-manager webhook to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=cert-manager-webhook, namespace=metalk8s-certs)
    - comment: wait for cert-manager-webhook
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.cert-manager.deployed.chart

Wait for cert-manager cainjector to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=cert-manager-cainjector, namespace=metalk8s-certs)
    - comment: wait for cert-manager-cainjector
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.cert-manager.deployed.chart
