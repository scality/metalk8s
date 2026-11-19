include:
  - metalk8s.addons.cert-manager.deployed
  - metalk8s.addons.metalk8s-registry-operator.deployed.registry-namespace
  - .bootstrap
  - .registry
  - .mtls

Ensure cert-manager is ready before deploying the registry certificates:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.cert-manager.deployed
    - require_in:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.bootstrap
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.registry
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.mtls

Ensure namespace is created before deploying the registry mTLS CA:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-namespace
    - require_in:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.mtls

Wait for CA Certificate:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='cert-manager.io/v1', kind=Certificate,
        name="metalk8s-registry-ca", namespace="metalk8s-certs")
    - comment: Wait for metalk8s-registry-ca to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.bootstrap

Wait for mTLS CA Certificate:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='cert-manager.io/v1', kind=Certificate,
        name="metalk8s-registry-agent-auth-ca", namespace="metalk8s-registry")
    - comment: Wait for metalk8s-registry-agent-auth-ca to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.mtls
