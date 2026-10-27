include:
  - metalk8s.addons.prometheus-operator.deployed
  - metalk8s.addons.metalk8s-registry-operator.deployed

# The ServiceMonitor CRD is deployed by the prometheus-operator chart
Wait for the ServiceMonitor CRD to be Established:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apiextensions.k8s.io/v1, kind=CustomResourceDefinition,
        name=servicemonitors.monitoring.coreos.com)
    - comment: Wait for the ServiceMonitor CRD to be Established
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.prometheus-operator.deployed.chart

# On a fresh cluster, registry.sls leaves monitoring out of the Registry CR,
# since the ServiceMonitor CRD does not exist yet when it is rendered
Enable monitoring on the Registry:
  metalk8s_kubernetes.object_updated:
    - name: main
    - kind: Registry
    - apiVersion: metalk8s.scality.com/v1alpha1
    # Keep in sync with registry.sls
    - patch:
        spec:
          monitoring:
            enabled: true
            prometheusLabels:
              metalk8s.scality.com/monitor: ""
    - content_type: application/merge-patch+json
    - require:
      - test: Wait for the ServiceMonitor CRD to be Established
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry
