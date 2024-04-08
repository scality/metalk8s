include:
  - .manifests

{#- In MetalK8s 128.0 this config has been removed
    This can be removed in `development/129.0` #}
Ensure old MetalK8s operator config does no longer exists:
  metalk8s_kubernetes.object_absent:
    - name: metalk8s-operator-manager-config
    - namespace: kube-system
    - apiVersion: v1
    - kind: ConfigMap
    - require:
      - sls: metalk8s.addons.metalk8s-operator.deployed.manifests

Wait for the MetalK8s Operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=metalk8s-operator-controller-manager, namespace=kube-system)
    - comment: Wait for the MetalK8s Operator to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.addons.metalk8s-operator.deployed.manifests

Wait for the ClusterConfig to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=metalk8s.scality.com/v1alpha1, kind=ClusterConfig,
        name=main)
    - comment: Wait for the ClusterConfig to be Ready
    - retry:
        attempts: 30
    - require:
      - test: Wait for the MetalK8s Operator to be Ready
