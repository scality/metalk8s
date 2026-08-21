include:
  - .bootstrap
  - .server
  - .agent
  - .mtls

Wait for Server CA Certificate:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='cert-manager.io/v1', kind=Certificate,
        name="metalk8s-registry-server-ca", namespace="metalk8s-certs")
    - comment: Wait for metalk8s-registry-server-ca to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.server

Wait for Agent CA Certificate:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion='cert-manager.io/v1', kind=Certificate,
        name="metalk8s-registry-agent-ca", namespace="metalk8s-certs")
    - comment: Wait for metalk8s-registry-agent-ca to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-registry-operator.deployed.registry-certs.agent

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
