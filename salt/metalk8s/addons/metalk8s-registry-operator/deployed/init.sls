include:
  - .namespace
  - .chart
  - .registry-namespace
  - .registry-certs
  - .registry

Wait for Operator Webhook Certificate:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='cert-manager.io/v1', kind=Certificate,
        name="metalk8s-registry-operator-serving-cert",
        namespace="metalk8s-registry-system")
    - comment: Wait for metalk8s-registry-operator webhook certificate to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.chart

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
      - test: Wait for Operator Webhook Certificate
    - require_in:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry

# The operator's validating webhook rejects the Registry CR at create time if
# the referenced Issuers / mTLS CA secret do not exist yet, so gate .registry
# on both the target namespace and the certs — not just the readiness wait.
# Additionally, we must wait for the Certificate objects to reach Ready status
# before the Registry CR is deployed, ensuring the ClusterIssuers are backed by
# valid CA certificates.
Registry CR prerequisites in place:
  test.nop:
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-namespace
      - test: Wait for Server CA Certificate
      - test: Wait for Agent CA Certificate
      - test: Wait for mTLS CA Certificate
    - require_in:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry

Wait for the Registry to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='metalk8s.scality.com/v1alpha1', kind=Registry,
        name="main", namespace="metalk8s-registry")
    - comment: Wait for metalk8s-registry to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry
