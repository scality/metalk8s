#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter
  namespace: metalk8s-monitoring
---
apiVersion: v1
data:
  config.yaml: |-
    rules:
    - seriesQuery: '{__name__=~"^container_.*",container!="POD",namespace!="",pod!=""}'
      seriesFilters: []
      resources:
        overrides:
          namespace:
            resource: namespace
          pod:
            resource: pod
      name:
        matches: ^container_(.*)_seconds_total$
        as: ""
      metricsQuery: sum(rate(<<.Series>>{<<.LabelMatchers>>,container!="POD"}[5m]))
        by (<<.GroupBy>>)
    - seriesQuery: '{__name__=~"^container_.*",container!="POD",namespace!="",pod!=""}'
      seriesFilters:
      - isNot: ^container_.*_seconds_total$
      resources:
        overrides:
          namespace:
            resource: namespace
          pod:
            resource: pod
      name:
        matches: ^container_(.*)_total$
        as: ""
      metricsQuery: sum(rate(<<.Series>>{<<.LabelMatchers>>,container!="POD"}[5m]))
        by (<<.GroupBy>>)
    - seriesQuery: '{__name__=~"^container_.*",container!="POD",namespace!="",pod!=""}'
      seriesFilters:
      - isNot: ^container_.*_total$
      resources:
        overrides:
          namespace:
            resource: namespace
          pod:
            resource: pod
      name:
        matches: ^container_(.*)$
        as: ""
      metricsQuery: sum(<<.Series>>{<<.LabelMatchers>>,container!="POD"}) by (<<.GroupBy>>)
    - seriesQuery: '{namespace!="",__name__!~"^container_.*"}'
      seriesFilters:
      - isNot: .*_total$
      resources:
        template: <<.Resource>>
      name:
        matches: ""
        as: ""
      metricsQuery: sum(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)
    - seriesQuery: '{namespace!="",__name__!~"^container_.*"}'
      seriesFilters:
      - isNot: .*_seconds_total
      resources:
        template: <<.Resource>>
      name:
        matches: ^(.*)_total$
        as: ""
      metricsQuery: sum(rate(<<.Series>>{<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>)
    - seriesQuery: '{namespace!="",__name__!~"^container_.*"}'
      seriesFilters: []
      resources:
        template: <<.Resource>>
      name:
        matches: ^(.*)_seconds_total$
        as: ""
      metricsQuery: sum(rate(<<.Series>>{<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>)
    resourceRules:
      cpu:
        containerLabel: container_name
        containerQuery: sum(rate(container_cpu_usage_seconds_total{<<.LabelMatchers>>}[3m])) by (<<.GroupBy>>)
        nodeQuery: sum(rate(container_cpu_usage_seconds_total{<<.LabelMatchers>>, id='/'}[3m])) by (<<.GroupBy>>)
        resources:
          overrides:
            namespace:
              resource: namespace
            node:
              resource: node
            pod:
              resource: pod
      memory:
        containerLabel: container_name
        containerQuery: sum(container_memory_working_set_bytes{<<.LabelMatchers>>}) by (<<.GroupBy>>)
        nodeQuery: sum(container_memory_working_set_bytes{<<.LabelMatchers>>,id='/'}) by (<<.GroupBy>>)
        resources:
          overrides:
            namespace:
              resource: namespace
            node:
              resource: node
            pod:
              resource: pod
      window: 3m
kind: ConfigMap
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-resource-reader
  namespace: metalk8s-monitoring
rules:
- apiGroups:
  - ''
  resources:
  - namespaces
  - pods
  - services
  - configmaps
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-server-resources
  namespace: metalk8s-monitoring
rules:
- apiGroups:
  - custom.metrics.k8s.io
  resources:
  - '*'
  verbs:
  - '*'
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-metrics
  namespace: metalk8s-monitoring
rules:
- apiGroups:
  - ''
  resources:
  - pods
  - nodes
  - nodes/stats
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-system-auth-delegator
  namespace: metalk8s-monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:auth-delegator
subjects:
- kind: ServiceAccount
  name: prometheus-adapter
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-resource-reader
  namespace: metalk8s-monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-adapter-resource-reader
subjects:
- kind: ServiceAccount
  name: prometheus-adapter
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-hpa-controller
  namespace: metalk8s-monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-adapter-server-resources
subjects:
- kind: ServiceAccount
  name: prometheus-adapter
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-hpa-controller-metrics
  namespace: metalk8s-monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-adapter-metrics
subjects:
- kind: ServiceAccount
  name: prometheus-adapter
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter-auth-reader
  namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: extension-apiserver-authentication-reader
subjects:
- kind: ServiceAccount
  name: prometheus-adapter
  namespace: metalk8s-monitoring
---
apiVersion: v1
kind: Service
metadata:
  annotations: {}
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter
  namespace: metalk8s-monitoring
spec:
  ports:
  - port: 443
    protocol: TCP
    targetPort: https
  selector:
    app: prometheus-adapter
    release: prometheus-adapter
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: prometheus-adapter
  namespace: metalk8s-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus-adapter
      release: prometheus-adapter
  template:
    metadata:
      annotations:
        checksum/config: 78db41895b530d031fc6986d06be80739327f0d2777cb46288a7923ea5211e63
      labels:
        app: prometheus-adapter
        app.kubernetes.io/managed-by: salt
        app.kubernetes.io/name: prometheus-adapter
        app.kubernetes.io/part-of: metalk8s
        chart: prometheus-adapter-2.12.2
        heritage: metalk8s
        release: prometheus-adapter
      name: prometheus-adapter
    spec:
      affinity: {}
      containers:
      - args:
        - /adapter
        - --secure-port=6443
        - --cert-dir=/tmp/cert
        - --logtostderr=true
        - --prometheus-url=http://prometheus-operator-prometheus:9090
        - --metrics-relist-interval=1m
        - --v=4
        - --config=/etc/adapter/config.yaml
        image: '{%- endraw -%}{{ build_image_name("k8s-prometheus-adapter-amd64",
          False) }}{%- raw -%}:v0.8.4'
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /healthz
            port: https
            scheme: HTTPS
          initialDelaySeconds: 30
        name: prometheus-adapter
        ports:
        - containerPort: 6443
          name: https
        readinessProbe:
          httpGet:
            path: /healthz
            port: https
            scheme: HTTPS
          initialDelaySeconds: 30
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - all
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 10001
        volumeMounts:
        - mountPath: /etc/adapter/
          name: config
          readOnly: true
        - mountPath: /tmp
          name: tmp
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      priorityClassName: null
      serviceAccountName: prometheus-adapter
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes:
      - configMap:
          name: prometheus-adapter
        name: config
      - emptyDir: {}
        name: tmp
---
apiVersion: apiregistration.k8s.io/v1beta1
kind: APIService
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: v1beta1.custom.metrics.k8s.io
  namespace: metalk8s-monitoring
spec:
  group: custom.metrics.k8s.io
  groupPriorityMinimum: 100
  insecureSkipTLSVerify: true
  service:
    name: prometheus-adapter
    namespace: metalk8s-monitoring
  version: v1beta1
  versionPriority: 100
---
apiVersion: apiregistration.k8s.io/v1beta1
kind: APIService
metadata:
  labels:
    app: prometheus-adapter
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-adapter-2.12.2
    heritage: metalk8s
    release: prometheus-adapter
  name: v1beta1.metrics.k8s.io
  namespace: metalk8s-monitoring
spec:
  group: metrics.k8s.io
  groupPriorityMinimum: 100
  insecureSkipTLSVerify: true
  service:
    name: prometheus-adapter
    namespace: metalk8s-monitoring
  version: v1beta1
  versionPriority: 100

{% endraw %}
