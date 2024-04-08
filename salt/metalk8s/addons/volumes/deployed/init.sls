include:
  - .manifests

{#- In MetalK8s 128.0 this config has been removed
    This can be removed in `development/129.0` #}
Ensure old Storage operator config does no longer exists:
  metalk8s_kubernetes.object_absent:
    - name: storage-operator-manager-config
    - namespace: kube-system
    - apiVersion: v1
    - kind: ConfigMap
    - require:
      - sls: metalk8s.addons.volumes.deployed.manifests
