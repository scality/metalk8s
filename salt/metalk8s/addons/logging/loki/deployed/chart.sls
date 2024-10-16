#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- set loki_defaults = salt.slsutil.renderer('salt://metalk8s/addons/logging/loki/config/loki.yaml', saltenv=saltenv) %}
{%- set loki = salt.metalk8s_service_configuration.get_service_conf('metalk8s-logging', 'metalk8s-loki-config', loki_defaults) %}

{% raw %}

apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
  labels:
    app.kubernetes.io/component: single-binary
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: loki
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
                app.kubernetes.io/instance: loki
                app.kubernetes.io/name: loki
            topologyKey: kubernetes.io/hostname
      automountServiceAccountToken: true
      containers:
      - args:
        - -config.file=/etc/loki/config/config.yaml
        - -target=all,table-manager
        image: {% endraw -%}{{ build_image_name("loki", False) }}{%- raw %}:2.9.6
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
      - name: config
        secret:
          secretName: loki
      - configMap:
          name: loki-runtime
        name: runtime-config
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
    app.kubernetes.io/version: 2.9.6
    helm.sh/chart: loki-5.48.0
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
