{#- Due to a bug in Loki that prevent deletion of the old chunks,
    Use a Job to delete old chunks waiting for a proper fix
    This state deploy the Service Account and ClusterRoleBinding used by the Workload Job #}

Create Loki Cleaner Workaround Service Account:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: loki-cleaner-wa
          namespace: metalk8s-logging

Create Loki Cleaner Workaround ClusterRoleBinding:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: loki-cleaner-wa
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: cluster-admin
        subjects:
        - kind: ServiceAccount
          name: loki-cleaner-wa
          namespace: metalk8s-logging
    - require:
      - metalk8s_kubernetes: Create Loki Cleaner Workaround Service Account
