include:
  - .namespace
  - .chart
  - .registry-namespace
  - .registry-certs
  - .registry

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
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.namespace
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.chart
    - require_in:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry

# The operator's validating webhook rejects the Registry CR at create time if
# the referenced Issuers / mTLS CA secret do not exist yet, so gate .registry
# on both the target namespace and the certs — not just the readiness wait.
Registry CR prerequisites in place:
  test.nop:
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-namespace
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs
    - require_in:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry

Wait for the Registry to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='metalk8s.scality.com/v1alpha1', kind=Registry,
        name="main")
    - comment: Wait for metalk8s-registry to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry
