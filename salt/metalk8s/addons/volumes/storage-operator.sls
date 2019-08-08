#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

apiVersion: v1
kind: ServiceAccount
metadata:
  name: storage-operator
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  creationTimestamp: null
  name: storage-operator
rules:
- apiGroups:
  - ""
  resources:
  - pods
  - services
  - endpoints
  - persistentvolumes
  - persistentvolumeclaims
  - events
  - configmaps
  - secrets
  verbs:
  - '*'
- apiGroups:
  - apps
  resources:
  - deployments
  - daemonsets
  - replicasets
  - statefulsets
  verbs:
  - '*'
- apiGroups:
  - monitoring.coreos.com
  resources:
  - servicemonitors
  verbs:
  - get
  - create
- apiGroups:
  - apps
  resourceNames:
  - storage-operator
  resources:
  - deployments/finalizers
  verbs:
  - update
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - get
- apiGroups:
  - apps
  resources:
  - replicasets
  verbs:
  - get
- apiGroups:
  - storage.metalk8s.scality.com
  resources:
  - '*'
  verbs:
  - '*'
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: storage-operator
subjects:
- kind: ServiceAccount
  name: storage-operator
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: storage-operator
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storage-operator
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      name: storage-operator
  template:
    metadata:
      labels:
        name: storage-operator
    spec:
      serviceAccountName: storage-operator
      tolerations:
      - key: "node-role.kubernetes.io/bootstrap"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/infra"
        operator: "Exists"
        effect: "NoSchedule"
      - key: "node-role.kubernetes.io/master"
        operator: "Exists"
        effect: "NoSchedule"
      containers:
        - name: storage-operator
          image: {{ build_image_name('storage-operator') }}
          command:
          - storage-operator
          imagePullPolicy: Always
          env:
            - name: WATCH_NAMESPACE
              value: ''
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: OPERATOR_NAME
              value: "storage-operator"
