Deploy admin user ClusterRoleBinding:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: kubeadm:cluster-admin
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: cluster-admin
        subjects:
        - kind: Group
          name: kubeadm:cluster-admins
          apiGroup: rbac.authorization.k8s.io
