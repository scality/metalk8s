#! metalk8s_kubernetes

apiVersion: v1
kind: ServiceAccount
metadata:
  name: ui-operator
  namespace: metalk8s-ui
  labels:
    app.kubernetes.io/name: ui-operator
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
automountServiceAccountToken: true

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ui-operator
  labels:
    app.kubernetes.io/name: ui-operator
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
rules:
- apiGroups: [""]
  resources: ["configmaps", "services"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: ["ui.scality.com"]
  resources: ["scalityuicomponentexposers", "scalityuicomponents", "scalityuis"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
- apiGroups: ["ui.scality.com"]
  resources: ["scalityuicomponentexposers/finalizers", "scalityuicomponents/finalizers", "scalityuis/finalizers"]
  verbs: ["update"]
- apiGroups: ["ui.scality.com"]
  resources: ["scalityuicomponentexposers/status", "scalityuicomponents/status", "scalityuis/status"]
  verbs: ["get", "patch", "update"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ui-operator
  labels:
    app.kubernetes.io/name: ui-operator
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    heritage: metalk8s
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ui-operator
subjects:
- kind: ServiceAccount
  name: ui-operator
  namespace: metalk8s-ui
