{#- Some objects has been removed/renamed with the new dex chart,
    so let's cleanup old ones
    NOTE: This logic can be removed in `development/124.0` #}

Delete old dex ClusterRoleBinding:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: ClusterRoleBinding
        - name: dex
        - namespace: metalk8s-auth
