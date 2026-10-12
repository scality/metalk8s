include:
  - metalk8s.addons.prometheus-operator.deployed.namespace
  - .chart
  - .policy
  - .workload-plane-alerts-rules

Ensure namespace is created before deploying node-warden-operator:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.addons.prometheus-operator.deployed.namespace
    - require_in:
      - sls: metalk8s.addons.node-warden-operator.deployed.chart

Wait for the node-warden-operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=node-warden-operator-controller-manager, namespace=metalk8s-monitoring)
    - comment: Wait for the node-warden-operator to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.node-warden-operator.deployed.chart
    - require_in:
      - sls: metalk8s.addons.node-warden-operator.deployed.policy

# The policy goes through the operator validating webhook. cert-manager
# cainjector injects the webhook CA bundle once the configuration exists, and
# the API server rejects the policy until then. With no cainjector leader,
# e.g. during an upgrade, the injection can take a few minutes.
Wait for the node-warden-operator webhook CA bundle to be injected:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=admissionregistration.k8s.io/v1,
        kind=ValidatingWebhookConfiguration,
        name=node-warden-operator-validating-webhook-configuration)
    - comment: Wait for the node-warden-operator webhook CA bundle to be injected
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.node-warden-operator.deployed.chart
    - require_in:
      - sls: metalk8s.addons.node-warden-operator.deployed.policy
