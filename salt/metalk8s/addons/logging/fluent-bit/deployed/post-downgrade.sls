{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- Some objects has been removed/renamed with the new fluent-bit chart,
    so let's cleanup new ones
    NOTE: This logic can be removed in `development/124.0` #}

{%- if salt.pkg.version_cmp(dest_version, '123.0.0') == -1 %}

Cleanup new fluent-bit ServiceMonitor:
    metalk8s_kubernetes.object_absent:
        - apiVersion: monitoring.coreos.com/v1
        - kind: ServiceMonitor
        - name: fluent-bit
        - namespace: metalk8s-logging

Cleanup new fluent-bit Service:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: Service
        - name: fluent-bit
        - namespace: metalk8s-logging

{# Those ones just get renamed from `fluent-bit-clusterrole` and
   `fluent-bit-clusterrolebinding` to `fluent-bit` #}
Cleanup new fluent-bit ClusterRole:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: ClusterRole
        - name: fluent-bit
        - namespace: metalk8s-logging

Cleanup new fluent-bit ClusterRoleBinding:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: ClusterRoleBinding
        - name: fluent-bit
        - namespace: metalk8s-logging

{%- endif %}
