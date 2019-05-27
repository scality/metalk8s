#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_repo with context %}
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb-controller
  namespace: metallb-system
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb-speaker
  namespace: metallb-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb:controller
  namespace: metallb-system
rules:
- apiGroups:
  - ''
  resources:
  - services
  verbs:
  - get
  - list
  - watch
  - update
- apiGroups:
  - ''
  resources:
  - services/status
  verbs:
  - update
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
  - patch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb:speaker
  namespace: metallb-system
rules:
- apiGroups:
  - ''
  resources:
  - services
  - endpoints
  - nodes
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb-config-watcher
  namespace: metallb-system
rules:
- apiGroups:
  - ''
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb:controller
  namespace: metallb-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metallb:controller
subjects:
- kind: ServiceAccount
  name: metallb-controller
  namespace: metallb-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb:speaker
  namespace: metallb-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metallb:speaker
subjects:
- kind: ServiceAccount
  name: metallb-speaker
  namespace: metallb-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app: metallb
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    heritage: metalk8s
    release: metallb
  name: metallb-config-watcher
  namespace: metallb-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: metallb-config-watcher
subjects:
- kind: ServiceAccount
  name: metallb-controller
- kind: ServiceAccount
  name: metallb-speaker
---
apiVersion: apps/v1beta2
kind: DaemonSet
metadata:
  labels:
    app: metallb
    app.kubernetes.io/component: speaker
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    component: speaker
    heritage: metalk8s
    release: metallb
  name: metallb-speaker
  namespace: metallb-system
spec:
  selector:
    matchLabels:
      app: metallb
      component: speaker
      release: metallb
  template:
    metadata:
      annotations:
        prometheus.io/port: '7472'
        prometheus.io/scrape: 'true'
      labels:
        app: metallb
        app.kubernetes.io/component: speaker
        app.kubernetes.io/managed-by: metalk8s
        app.kubernetes.io/name: metallb
        app.kubernetes.io/part-of: metalk8s
        chart: metallb-0.9.5
        component: speaker
        heritage: metalk8s
        release: metallb
    spec:
      containers:
      - args:
        - --port=7472
        - --config=metallb-config
        env:
        - name: METALLB_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        image: '{{ build_image_repo("metallb-speaker") }}:v0.7.3'
        imagePullPolicy: IfNotPresent
        name: speaker
        ports:
        - containerPort: 7472
          name: monitoring
        resources:
          limits:
            cpu: 100m
            memory: 100Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            add:
            - NET_RAW
            drop:
            - ALL
          readOnlyRootFilesystem: true
      hostNetwork: true
      serviceAccountName: metallb-speaker
      terminationGracePeriodSeconds: 0
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
---
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  labels:
    app: metallb
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    chart: metallb-0.9.5
    component: controller
    heritage: metalk8s
    release: metallb
  name: metallb-controller
  namespace: metallb-system
spec:
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: metallb
      component: controller
      release: metallb
  template:
    metadata:
      annotations:
        prometheus.io/port: '7472'
        prometheus.io/scrape: 'true'
      labels:
        app: metallb
        app.kubernetes.io/component: controller
        app.kubernetes.io/managed-by: metalk8s
        app.kubernetes.io/name: metallb
        app.kubernetes.io/part-of: metalk8s
        chart: metallb-0.9.5
        component: controller
        heritage: metalk8s
        release: metallb
    spec:
      containers:
      - args:
        - --port=7472
        - --config=metallb-config
        image: '{{ build_image_repo("metallb-controller") }}:v0.7.3'
        imagePullPolicy: IfNotPresent
        name: controller
        ports:
        - containerPort: 7472
          name: monitoring
        resources:
          limits:
            cpu: 100m
            memory: 100Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
      serviceAccountName: metallb-controller
      terminationGracePeriodSeconds: 0
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
