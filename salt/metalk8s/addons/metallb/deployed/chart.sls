#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-controller
  namespace: metalk8s-loadbalancing
---
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: speaker
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-speaker
  namespace: metalk8s-loadbalancing
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-controller
  namespace: metalk8s-loadbalancing
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
- apiGroups:
  - policy
  resourceNames:
  - metallb-controller
  resources:
  - podsecuritypolicies
  verbs:
  - use
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/component: speaker
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-speaker
  namespace: metalk8s-loadbalancing
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
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - policy
  resourceNames:
  - metallb-speaker
  resources:
  - podsecuritypolicies
  verbs:
  - use
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-controller
  namespace: metalk8s-loadbalancing
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metallb-controller
subjects:
- kind: ServiceAccount
  name: metallb-controller
  namespace: metalk8s-loadbalancing
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/component: speaker
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-speaker
  namespace: metalk8s-loadbalancing
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metallb-speaker
subjects:
- kind: ServiceAccount
  name: metallb-speaker
  namespace: metalk8s-loadbalancing
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-config-watcher
  namespace: metalk8s-loadbalancing
rules:
- apiGroups:
  - ''
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/component: speaker
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-pod-lister
  namespace: metalk8s-loadbalancing
rules:
- apiGroups:
  - ''
  resources:
  - pods
  verbs:
  - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-config-watcher
  namespace: metalk8s-loadbalancing
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
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/component: speaker
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-pod-lister
  namespace: metalk8s-loadbalancing
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: metallb-pod-lister
subjects:
- kind: ServiceAccount
  name: metallb-speaker
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/component: speaker
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-speaker
  namespace: metalk8s-loadbalancing
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: speaker
      app.kubernetes.io/instance: metallb
      app.kubernetes.io/name: metallb
  template:
    metadata:
      labels:
        app.kubernetes.io/component: speaker
        app.kubernetes.io/instance: metallb
        app.kubernetes.io/managed-by: salt
        app.kubernetes.io/name: metallb
        app.kubernetes.io/part-of: metalk8s
        helm.sh/chart: metallb-3.0.6
        heritage: metalk8s
    spec:
      affinity:
        nodeAffinity: null
        podAffinity: null
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/component: speaker
                  app.kubernetes.io/instance: metallb
                  app.kubernetes.io/name: metallb
              namespaces:
              - metalk8s-loadbalancing
              topologyKey: kubernetes.io/hostname
            weight: 1
      containers:
      - args:
        - --port=7472
        - --config=metallb-config
        env:
        - name: METALLB_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: METALLB_HOST
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
        - name: METALLB_ML_BIND_ADDR
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: METALLB_ML_LABELS
          value: app.kubernetes.io/name=metallb,app.kubernetes.io/instance=metallb,app.kubernetes.io/component=speaker
        - name: METALLB_ML_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: METALLB_ML_SECRET_KEY
          valueFrom:
            secretKeyRef:
              key: secretkey
              name: metallb-memberlist
        envFrom: null
        image: {% endraw -%}{{ build_image_name("metallb-speaker", False) }}{%- raw %}:0.12.1-debian-10-r90
        imagePullPolicy: IfNotPresent
        livenessProbe:
          failureThreshold: 3
          httpGet:
            path: /metrics
            port: metrics
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        name: metallb-speaker
        ports:
        - containerPort: 7472
          name: metrics
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /metrics
            port: metrics
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        resources:
          limits: {}
          requests: {}
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
            - SYS_ADMIN
            drop:
            - ALL
          readOnlyRootFilesystem: true
          runAsUser: 0
      hostNetwork: true
      nodeSelector:
        kubernetes.io/os: linux
        node-role.kubernetes.io/master: ''
      securityContext:
        fsGroup: 0
      serviceAccountName: metallb-speaker
      terminationGracePeriodSeconds: 2
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
  updateStrategy:
    type: RollingUpdate
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-controller
  namespace: metalk8s-loadbalancing
spec:
  replicas: 1
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app.kubernetes.io/component: controller
      app.kubernetes.io/instance: metallb
      app.kubernetes.io/name: metallb
  strategy:
    type: RollingUpdate
  template:
    metadata:
      annotations:
        checksum/config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="ConfigMap",
          apiVersion="v1", namespace="metalk8s-loadbalancing", name="metallb-config",
          path="data:config")
      labels:
        app.kubernetes.io/component: controller
        app.kubernetes.io/instance: metallb
        app.kubernetes.io/managed-by: salt
        app.kubernetes.io/name: metallb
        app.kubernetes.io/part-of: metalk8s
        helm.sh/chart: metallb-3.0.6
        heritage: metalk8s
    spec:
      affinity:
        nodeAffinity: null
        podAffinity: null
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/component: controller
                  app.kubernetes.io/instance: metallb
                  app.kubernetes.io/name: metallb
              namespaces:
              - metalk8s-loadbalancing
              topologyKey: kubernetes.io/hostname
            weight: 1
      containers:
      - args:
        - --port=7472
        - --config=metallb-config
        env: null
        envFrom: null
        image: {% endraw -%}{{ build_image_name("metallb-controller", False) }}{%- raw %}:0.12.1-debian-10-r89
        imagePullPolicy: IfNotPresent
        livenessProbe:
          failureThreshold: 3
          httpGet:
            path: /metrics
            port: metrics
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        name: metallb-controller
        ports:
        - containerPort: 7472
          name: metrics
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /metrics
            port: metrics
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        resources:
          limits: {}
          requests: {}
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
      nodeSelector:
        kubernetes.io/os: linux
        node-role.kubernetes.io/master: ''
      securityContext:
        fsGroup: 1001
      serviceAccountName: metallb-controller
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
---
apiVersion: v1
data:
  secretkey: V3NINmJucWdkSDFaelRHWHlvZEh1RHNjOHFtbzd0Z0dGam5DbXpKa1MxU1lkNktRcmthVDBrcjlJeU9lOEgyZHI4QndxZm5hOGFlWndsRWhubnY0QmpFcmpOZnJPSWh0TlhpcmowRUVvYmd6VWtqMDBncEcxelZTSGFZRTg1Mk9NcEh4c200Z3RLMkh0bzZsTFpGNUNSdDhTaWFNTzFpTXBYQUVGT0FSZVdqZExKdU52R0RtOVhZMVBNWWtYQlNMOEZaamM1cFpqOUdTR0dPQ3FiSUpsOWozMk1wcml2VGV2OERnN2NnYmhweUVtY1h2alBOczFxcTZOV3BQTWgydw==
kind: Secret
metadata:
  annotations:
    helm.sh/hook: pre-install
    helm.sh/hook-delete-policy: before-hook-creation
  labels:
    app.kubernetes.io/component: speaker
    app.kubernetes.io/instance: metallb
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: metallb
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: metallb-3.0.6
    heritage: metalk8s
  name: metallb-memberlist
  namespace: metalk8s-loadbalancing

{% endraw %}
