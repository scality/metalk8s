include:
  - .manifests

{#- Some logic to handle upgrade from MetalK8s < 125.0 #}
{#- This logic can be removed in `development/126.0` #}
{%- set ingress_ip = salt.pillar.get("networks:control_plane:ingress:ip") %}
{#- Only consider the Ingress IP from bootstrap config if there is nothing defined in the ClusterConfig #}
{%- if ingress_ip and not salt.pillar.get("metalk8s:cluster_config:spec:controlPlane:ingress") %}
  {%- set cp_ingress_spec = { "externalIP": {"address": ingress_ip }} %}
  {%- if salt.pillar.get("networks:control_plane:metalLB:enabled") %}
    {%- set cp_ingress_spec = { "managedVirtualIP": {"address": ingress_ip }} %}
  {%- endif %}

Patch ClusterConfig to match Bootstrap config:
  metalk8s_kubernetes.object_updated:
    - apiVersion: metalk8s.scality.com/v1alpha1
    - kind: ClusterConfig
    - name: main
    - patch:
        spec:
          controlPlane:
            ingress: {{ cp_ingress_spec }}
    - content_type: application/merge-patch+json
    - require:
      - test: Wait for the MetalK8s Operator to be Ready
    - require_in:
      - test: Wait for the ClusterConfig to be Ready

Reconfigure Control Plane Ingress:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.addons.nginx-ingress-control-plane.deployed
  - saltenv: {{ saltenv }}
  - require:
    - test: Wait for the ClusterConfig to be Ready

{%- endif %}

Wait for the MetalK8s Operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=metalk8s-operator-controller-manager, namespace=kube-system)
    - comment: Wait for the MetalK8s Operator to be Ready
    - retry:
        attempts: 10
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
        attempts: 10
    - require:
      - test: Wait for the MetalK8s Operator to be Ready
