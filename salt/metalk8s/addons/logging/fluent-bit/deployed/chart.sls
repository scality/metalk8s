#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  allowPrivilegeEscalation: false
  fsGroup:
    rule: RunAsAny
  hostIPC: false
  hostNetwork: false
  hostPID: false
  privileged: false
  readOnlyRootFilesystem: true
  requiredDropCapabilities:
  - ALL
  runAsUser:
    rule: RunAsAny
  seLinux:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  volumes:
  - secret
  - configMap
  - hostPath
  - projected
  - downwardAPI
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit
  namespace: metalk8s-logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit-clusterrole
  namespace: metalk8s-logging
rules:
- apiGroups:
  - ''
  resources:
  - namespaces
  - pods
  verbs:
  - get
  - watch
  - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit-clusterrolebinding
  namespace: metalk8s-logging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluent-bit-clusterrole
subjects:
- kind: ServiceAccount
  name: fluent-bit
  namespace: metalk8s-logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit
  namespace: metalk8s-logging
rules:
- apiGroups:
  - extensions
  resourceNames:
  - fluent-bit
  resources:
  - podsecuritypolicies
  verbs:
  - use
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit
  namespace: metalk8s-logging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: fluent-bit
subjects:
- kind: ServiceAccount
  name: fluent-bit
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit-headless
  namespace: metalk8s-logging
spec:
  clusterIP: None
  ports:
  - name: http-metrics
    port: 2020
    protocol: TCP
    targetPort: http-metrics
  selector:
    app: fluent-bit
    release: fluent-bit
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  annotations: {}
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    release: fluent-bit
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
      release: fluent-bit
  template:
    metadata:
      annotations:
        checksum/config: 3bed338de62965258211f9a86544e9b6437e23d31787a38f9051656e4a6e68c9
        prometheus.io/path: /api/v1/metrics/prometheus
        prometheus.io/port: '2020'
        prometheus.io/scrape: 'true'
      labels:
        app: fluent-bit
        release: fluent-bit
    spec:
      affinity: {}
      containers:
      - image: {% endraw -%}{{ build_image_name("fluent-bit-plugin-loki", False) }}{%- raw %}:1.6.0-amd64
        imagePullPolicy: IfNotPresent
        name: fluent-bit-loki
        ports:
        - containerPort: 2020
          name: http-metrics
        resources:
          limits:
            memory: 100Mi
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - mountPath: /fluent-bit/etc
          name: config
        - mountPath: /run/fluent-bit
          name: run
        - mountPath: /var/log
          name: varlog
          readOnly: true
        - mountPath: /run/log
          name: runlog
          readOnly: true
      nodeSelector: {}
      serviceAccountName: fluent-bit
      terminationGracePeriodSeconds: 10
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/etcd
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists
      volumes:
      - configMap:
          name: fluent-bit
        name: config
      - hostPath:
          path: /run/fluent-bit
        name: run
      - hostPath:
          path: /var/log
        name: varlog
      - hostPath:
          path: /run/log
        name: runlog
  updateStrategy:
    type: RollingUpdate
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    chart: fluent-bit-2.0.1
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  endpoints:
  - path: /api/v1/metrics/prometheus
    port: http-metrics
  namespaceSelector:
    matchNames:
    - metalk8s-logging
  selector:
    matchLabels:
      app: fluent-bit
      release: fluent-bit

{% endraw %}
