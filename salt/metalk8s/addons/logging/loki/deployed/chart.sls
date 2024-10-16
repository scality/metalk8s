#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- set loki_defaults = salt.slsutil.renderer('salt://metalk8s/addons/logging/loki/config/loki.yaml', saltenv=saltenv) %}
{%- set loki = salt.metalk8s_service_configuration.get_service_conf('metalk8s-logging', 'metalk8s-loki-config', loki_defaults) %}

{% raw %}

apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  labels:
    app.kubernetes.io/component: memcached-chunks-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/name: loki
  name: loki-memcached-chunks-cache
  namespace: metalk8s-logging
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/component: memcached-chunks-cache
      app.kubernetes.io/instance: loki
      app.kubernetes.io/name: loki
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  labels:
    app.kubernetes.io/component: memcached-results-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/name: loki
  name: loki-memcached-results-cache
  namespace: metalk8s-logging
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/component: memcached-results-cache
      app.kubernetes.io/instance: loki
      app.kubernetes.io/name: loki
---
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki
  namespace: metalk8s-logging
---
apiVersion: v1
data:
  runtime-config.yaml: |-
    {}
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki-runtime
  namespace: metalk8s-logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki-clusterrole
  namespace: metalk8s-logging
rules:
- apiGroups:
  - ''
  resources:
  - configmaps
  - secrets
  verbs:
  - get
  - watch
  - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki-clusterrolebinding
  namespace: metalk8s-logging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: loki-clusterrole
subjects:
- kind: ServiceAccount
  name: loki
  namespace: metalk8s-logging
---
apiVersion: v1
kind: Service
metadata:
  annotations: {}
  labels:
    app.kubernetes.io/component: memcached-chunks-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki-chunks-cache
  namespace: metalk8s-logging
spec:
  clusterIP: None
  ports:
  - name: memcached-client
    port: 11211
    targetPort: 11211
  - name: http-metrics
    port: 9150
    targetPort: 9150
  selector:
    app.kubernetes.io/component: memcached-chunks-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/name: loki
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  annotations: {}
  labels:
    app.kubernetes.io/component: memcached-results-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki-results-cache
  namespace: metalk8s-logging
spec:
  clusterIP: None
  ports:
  - name: memcached-client
    port: 11211
    targetPort: 11211
  - name: http-metrics
    port: 9150
    targetPort: 9150
  selector:
    app.kubernetes.io/component: memcached-results-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/name: loki
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  annotations: null
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki-memberlist
  namespace: metalk8s-logging
spec:
  clusterIP: None
  ports:
  - name: tcp
    port: 7946
    protocol: TCP
    targetPort: http-memberlist
  selector:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: memberlist
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  annotations: null
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
    prometheus.io/service-monitor: 'false'
    variant: headless
  name: loki-headless
  namespace: metalk8s-logging
spec:
  clusterIP: None
  ports:
  - name: http-metrics
    port: 3100
    protocol: TCP
    targetPort: http-metrics
  selector:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/name: loki
---
apiVersion: v1
kind: Service
metadata:
  annotations: null
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki
  namespace: metalk8s-logging
spec:
  ports:
  - name: http-metrics
    port: 3100
    protocol: TCP
    targetPort: http-metrics
  - name: grpc
    port: 9095
    protocol: TCP
    targetPort: grpc
  selector:
    app.kubernetes.io/component: single-binary
    app.kubernetes.io/instance: loki
    app.kubernetes.io/name: loki
  type: ClusterIP
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  annotations: {}
  labels:
    app.kubernetes.io/component: memcached-chunks-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
    name: memcached-chunks-cache
  name: loki-chunks-cache
  namespace: metalk8s-logging
spec:
  podManagementPolicy: Parallel
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/component: memcached-chunks-cache
      app.kubernetes.io/instance: loki
      app.kubernetes.io/name: loki
      name: memcached-chunks-cache
  serviceName: loki-chunks-cache
  template:
    metadata:
      annotations: null
      labels:
        app.kubernetes.io/component: memcached-chunks-cache
        app.kubernetes.io/instance: loki
        app.kubernetes.io/name: loki
        name: memcached-chunks-cache
    spec:
      affinity: {}
      containers:
      - args:
        - -m 8192
        - --extended=modern,track_sizes
        - -I 5m
        - -c 16384
        - -v
        - -u 11211
        env: null
        envFrom: null
        image: memcached:1.6.23-alpine
        imagePullPolicy: IfNotPresent
        name: memcached
        ports:
        - containerPort: 11211
          name: client
        resources:
          limits:
            memory: 9830Mi
          requests:
            cpu: 500m
            memory: 9830Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
      - args:
        - --memcached.address=localhost:11211
        - --web.listen-address=0.0.0.0:9150
        image: prom/memcached-exporter:v0.14.2
        imagePullPolicy: IfNotPresent
        name: exporter
        ports:
        - containerPort: 9150
          name: http-metrics
        resources:
          limits: {}
          requests: {}
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
      initContainers: []
      nodeSelector: {}
      securityContext:
        fsGroup: 11211
        runAsGroup: 11211
        runAsNonRoot: true
        runAsUser: 11211
      serviceAccountName: loki
      terminationGracePeriodSeconds: 60
      tolerations: []
      topologySpreadConstraints: []
  updateStrategy:
    type: RollingUpdate
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  annotations: {}
  labels:
    app.kubernetes.io/component: memcached-results-cache
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
    name: memcached-results-cache
  name: loki-results-cache
  namespace: metalk8s-logging
spec:
  podManagementPolicy: Parallel
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/component: memcached-results-cache
      app.kubernetes.io/instance: loki
      app.kubernetes.io/name: loki
      name: memcached-results-cache
  serviceName: loki-results-cache
  template:
    metadata:
      annotations: null
      labels:
        app.kubernetes.io/component: memcached-results-cache
        app.kubernetes.io/instance: loki
        app.kubernetes.io/name: loki
        name: memcached-results-cache
    spec:
      affinity: {}
      containers:
      - args:
        - -m 1024
        - --extended=modern,track_sizes
        - -I 5m
        - -c 16384
        - -v
        - -u 11211
        env: null
        envFrom: null
        image: memcached:1.6.23-alpine
        imagePullPolicy: IfNotPresent
        name: memcached
        ports:
        - containerPort: 11211
          name: client
        resources:
          limits:
            memory: 1229Mi
          requests:
            cpu: 500m
            memory: 1229Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
      - args:
        - --memcached.address=localhost:11211
        - --web.listen-address=0.0.0.0:9150
        image: prom/memcached-exporter:v0.14.2
        imagePullPolicy: IfNotPresent
        name: exporter
        ports:
        - containerPort: 9150
          name: http-metrics
        resources:
          limits: {}
          requests: {}
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
      initContainers: []
      nodeSelector: {}
      securityContext:
        fsGroup: 11211
        runAsGroup: 11211
        runAsNonRoot: true
        runAsUser: 11211
      serviceAccountName: loki
      terminationGracePeriodSeconds: 60
      tolerations: []
      topologySpreadConstraints: []
  updateStrategy:
    type: RollingUpdate
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  labels:
    app.kubernetes.io/component: single-binary
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
  name: loki
  namespace: metalk8s-logging
spec:
  podManagementPolicy: Parallel
  replicas: {% endraw -%}{{ loki.spec.deployment.replicas }}{%- raw %}
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app.kubernetes.io/component: single-binary
      app.kubernetes.io/instance: loki
      app.kubernetes.io/name: loki
  serviceName: loki-headless
  template:
    metadata:
      annotations:
        checksum/config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="Secret",
          apiVersion="v1", namespace="metalk8s-logging", name="loki", path="data:config.yaml")
      labels:
        app.kubernetes.io/component: single-binary
        app.kubernetes.io/instance: loki
        app.kubernetes.io/name: loki
        app.kubernetes.io/part-of: memberlist
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app.kubernetes.io/component: single-binary
            topologyKey: kubernetes.io/hostname
      automountServiceAccountToken: true
      containers:
      - env:
        - name: METHOD
          value: WATCH
        - name: LABEL
          value: loki_rule
        - name: FOLDER
          value: /rules
        - name: RESOURCE
          value: both
        - name: WATCH_SERVER_TIMEOUT
          value: '60'
        - name: WATCH_CLIENT_TIMEOUT
          value: '60'
        - name: LOG_LEVEL
          value: INFO
        image: kiwigrid/k8s-sidecar:1.27.5
        imagePullPolicy: IfNotPresent
        name: loki-sc-rules
        volumeMounts:
        - mountPath: /rules
          name: sc-rules-volume
      - args:
        - -config.file=/etc/loki/config/config.yaml
        - -target=all,table-manager
        image: {% endraw -%}{{ build_image_name("loki", False) }}{%- raw %}:3.1.1
        imagePullPolicy: IfNotPresent
        name: loki
        ports:
        - containerPort: 3100
          name: http-metrics
          protocol: TCP
        - containerPort: 9095
          name: grpc
          protocol: TCP
        - containerPort: 7946
          name: http-memberlist
          protocol: TCP
        readinessProbe:
          httpGet:
            path: /ready
            port: http-metrics
          initialDelaySeconds: 30
          timeoutSeconds: 1
        resources: {% endraw -%}{{ loki.spec.deployment.resources }}{%- raw %}
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - mountPath: /tmp
          name: tmp
        - mountPath: /etc/loki/config
          name: config
        - mountPath: /etc/loki/runtime-config
          name: runtime-config
        - mountPath: /var/loki
          name: storage
        - mountPath: /rules
          name: sc-rules-volume
      enableServiceLinks: true
      securityContext:
        fsGroup: 10001
        runAsGroup: 10001
        runAsNonRoot: true
        runAsUser: 10001
      serviceAccountName: loki
      terminationGracePeriodSeconds: 30
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes:
      - emptyDir: {}
        name: tmp
      - configMap:
          items:
          - key: config.yaml
            path: config.yaml
          name: loki
        name: config
      - configMap:
          name: loki-runtime
        name: runtime-config
      - emptyDir: {}
        name: sc-rules-volume
  updateStrategy:
    rollingUpdate:
      partition: 0
  volumeClaimTemplates:
  - apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: storage
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
      selector:
        matchLabels:
          app.kubernetes.io/name: loki
      storageClassName: metalk8s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.1
    helm.sh/chart: loki-6.16.0
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
  name: loki
  namespace: metalk8s-logging
spec:
  endpoints:
  - interval: 15s
    path: /metrics
    port: http-metrics
    relabelings:
    - action: replace
      replacement: metalk8s-logging/$1
      sourceLabels:
      - job
      targetLabel: job
    - action: replace
      replacement: loki
      targetLabel: cluster
    scheme: http
  selector:
    matchExpressions:
    - key: prometheus.io/service-monitor
      operator: NotIn
      values:
      - 'false'
    matchLabels:
      app.kubernetes.io/instance: loki
      app.kubernetes.io/name: loki

{% endraw %}
