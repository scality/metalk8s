include:
  - .manifests

{#- In MetalK8s 126.0 the deployment of the storage-operator changed a bit
  including some resource renaming, let's remove old objects #}
{#- This logic can be removed in `development/127.0` #}

Delete old storage-operator ServiceAccount:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ServiceAccount
    - name: storage-operator
    - namespace: kube-system
    - require_in:
      - sls: metalk8s.addons.volumes.deployed.manifests

Delete old storage-operator Role:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: Role
    - name: leader-election-role
    - namespace: kube-system
    - require_in:
      - sls: metalk8s.addons.volumes.deployed.manifests

Delete old storage-operator ClusterRole:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: ClusterRole
    - name: storage-operator
    - require_in:
      - sls: metalk8s.addons.volumes.deployed.manifests

Delete old storage-operator RoleBinding:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: RoleBinding
    - name: leader-election-rolebinding
    - namespace: kube-system
    - require_in:
      - sls: metalk8s.addons.volumes.deployed.manifests

Delete old storage-operator ClusterRoleBinding:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: ClusterRoleBinding
    - name: storage-operator
    - require_in:
      - sls: metalk8s.addons.volumes.deployed.manifests

Delete old storage-operator Deployment:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: storage-operator
    - namespace: kube-system
    - wait:
        attempts: 30
        sleep: 10
    - require_in:
      - sls: metalk8s.addons.volumes.deployed.manifests
