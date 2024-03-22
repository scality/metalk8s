#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- set fluent_bit_defaults = salt.slsutil.renderer('salt://metalk8s/addons/logging/fluent-bit/config/fluent-bit.yaml.j2', saltenv=saltenv) %}
{%- set fluent_bit = salt.metalk8s_service_configuration.get_service_conf('metalk8s-logging', 'metalk8s-fluent-bit-config', fluent_bit_defaults) %}

{% raw %}

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.1.10
    helm.sh/chart: fluent-bit-0.39.0
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.1.10
    helm.sh/chart: fluent-bit-0.39.0
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
rules:
- apiGroups:
  - ''
  resources:
  - namespaces
  - pods
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.1.10
    helm.sh/chart: fluent-bit-0.39.0
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluent-bit
subjects:
- kind: ServiceAccount
  name: fluent-bit
  namespace: metalk8s-logging
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.1.10
    helm.sh/chart: fluent-bit-0.39.0
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  ports:
  - name: http
    port: 2020
    protocol: TCP
    targetPort: http
  selector:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/name: fluent-bit
  type: ClusterIP
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.1.10
    helm.sh/chart: fluent-bit-0.39.0
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: fluent-bit
      app.kubernetes.io/name: fluent-bit
  template:
    metadata:
      annotations:
        checksum/config: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        prometheus.io/path: /api/v1/metrics/prometheus
        prometheus.io/port: '2020'
        prometheus.io/scrape: 'true'
      labels:
        app.kubernetes.io/instance: fluent-bit
        app.kubernetes.io/name: fluent-bit
    spec:
      containers:
      - args:
        - --workdir=/fluent-bit/etc
        - --config=/fluent-bit/etc/conf/fluent-bit.conf
        command:
        - /fluent-bit/bin/fluent-bit
        image: {% endraw -%}{{ build_image_name("fluent-bit", False) }}{%- raw %}:2.1.10
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /
            port: http
        name: fluent-bit
        ports:
        - containerPort: 2020
          name: http
          protocol: TCP
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: http
        resources: {% endraw -%}{{ fluent_bit.spec.deployment.resources }}{%- raw %}
        volumeMounts:
        - mountPath: /fluent-bit/etc/conf
          name: config
        - mountPath: /run/fluent-bit
          name: run
        - mountPath: /var/log
          name: varlog
          readOnly: true
        - mountPath: /run/log
          name: runlog
          readOnly: true
      dnsPolicy: ClusterFirst
      hostNetwork: false
      serviceAccountName: fluent-bit
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
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.1.10
    helm.sh/chart: fluent-bit-0.39.0
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  endpoints:
  - path: /api/v1/metrics/prometheus
    port: http
  jobLabel: app.kubernetes.io/instance
  namespaceSelector:
    matchNames:
    - metalk8s-logging
  selector:
    matchLabels:
      app.kubernetes.io/instance: fluent-bit
      app.kubernetes.io/name: fluent-bit

{% endraw %}
