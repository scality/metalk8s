include:
  - .servicemonitor

Wait for cert-manager ServiceMonitor to be deployed:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=monitoring.coreos.com/v1, kind=ServiceMonitor,
        name=cert-manager, namespace=metalk8s-certs)
    - comment: Wait for cert-manager ServiceMonitor to be deployed
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.cert-manager.deployed.monitoring.servicemonitor
