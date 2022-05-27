{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- Some objects has been removed/renamed with the new dex chart,
    so let's cleanup new ones
    NOTE: This logic can be removed in `development/124.0` #}

{%- if salt.pkg.version_cmp(dest_version, '123.0.0') == -1 %}

Cleanup new dex-cluster ClusterRoleBinding:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: ClusterRoleBinding
        - name: dex-cluster
        - namespace: metalk8s-auth

Cleanup new dex Role:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: Role
        - name: dex
        - namespace: metalk8s-auth

Cleanup new dex RoleBinding:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: RoleBinding
        - name: dex
        - namespace: metalk8s-auth

{%- endif %}
