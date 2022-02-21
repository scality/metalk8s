{#- Some objects has been removed/renamed with the new fluent-bit chart,
    so let's cleanup old ones
    NOTE: This logic can be removed in `development/124.0` #}

Delete old fluent-bit PodSecurityPolicy:
    metalk8s_kubernetes.object_absent:
        - apiVersion: policy/v1beta1
        - kind: PodSecurityPolicy
        - name: fluent-bit
        - namespace: metalk8s-logging

Delete old fluent-bit Role:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: Role
        - name: fluent-bit
        - namespace: metalk8s-logging

Delete old fluent-bit RoleBinding:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: RoleBinding
        - name: fluent-bit
        - namespace: metalk8s-logging

{# Those ones just get renamed from `fluent-bit-clusterrole` and
   `fluent-bit-clusterrolebinding` to `fluent-bit` #}
Delete old fluent-bit ClusterRole:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: ClusterRole
        - name: fluent-bit-clusterrole
        - namespace: metalk8s-logging

Delete old fluent-bit ClusterRoleBinding:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: ClusterRole
        - name: fluent-bit-clusterrolebinding
        - namespace: metalk8s-logging
