{#- Some objects has been removed with the new Loki chart,
    so let's cleanup old ones
    NOTE: This logic can be removed in `development/126.0` #}

Delete old Loki PodSecurityPolicy:
    metalk8s_kubernetes.object_absent:
        - apiVersion: policy/v1beta1
        - kind: PodSecurityPolicy
        - name: loki
        - namespace: metalk8s-logging

Delete old Loki Role:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: Role
        - name: loki
        - namespace: metalk8s-logging

Delete old Loki RoleBinding:
    metalk8s_kubernetes.object_absent:
        - apiVersion: rbac.authorization.k8s.io/v1
        - kind: RoleBinding
        - name: loki
        - namespace: metalk8s-logging
