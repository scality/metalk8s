#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: node-problem-detector
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: node-problem-detector
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: node-problem-detector-2.4.1
    heritage: metalk8s
  name: node-problem-detector
  namespace: metalk8s-monitoring
---
apiVersion: v1
data:
  wp-monitor.json: |-
    {
      "plugin": "custom",
      "pluginConfig": {
        "invoke_interval": "30s",
        "timeout": "10s",
        "max_output_length": 120,
        "concurrency": 1,
        "skip_initial_status": true
      },
      "source": "workload-plane-monitor",
      "metricsReporting": true,
      "conditions": [
        {
          "type": "PodNetworkUnavailable",
          "reason": "PodNetworkReady",
          "message": "pod network reachable"
        }
      ],
      "rules": [
        {
          "type": "permanent",
          "condition": "PodNetworkUnavailable",
          "reason": "PodNetworkUnreachable",
          "path": "/scripts/check-wp.sh",
          "timeout": "10s"
        }
      ]
    }
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/instance: node-problem-detector
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: node-problem-detector
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: node-problem-detector-2.4.1
    heritage: metalk8s
  name: node-problem-detector-custom-config
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: node-problem-detector
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: node-problem-detector
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: node-problem-detector-2.4.1
    heritage: metalk8s
  name: node-problem-detector
  namespace: metalk8s-monitoring
rules:
- apiGroups:
  - ''
  resources:
  - nodes
  verbs:
  - get
- apiGroups:
  - ''
  resources:
  - nodes/status
  verbs:
  - patch
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
  - patch
  - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: node-problem-detector
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: node-problem-detector
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: node-problem-detector-2.4.1
    heritage: metalk8s
  name: node-problem-detector
  namespace: metalk8s-monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-problem-detector
subjects:
- kind: ServiceAccount
  name: node-problem-detector
  namespace: metalk8s-monitoring
---
apiVersion: v1
kind: Service
metadata:
  annotations:
    prometheus.io/path: /metrics
    prometheus.io/port: '20257'
    prometheus.io/scheme: http
    prometheus.io/scrape: 'true'
  labels:
    app: node-problem-detector
    app.kubernetes.io/instance: node-problem-detector
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: node-problem-detector
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: node-problem-detector-2.4.1
    heritage: metalk8s
  name: node-problem-detector
  namespace: metalk8s-monitoring
spec:
  clusterIP: None
  ports:
  - name: exporter
    port: 20257
    protocol: TCP
  selector:
    app: node-problem-detector
  type: ClusterIP
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/instance: node-problem-detector
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: node-problem-detector
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: node-problem-detector-2.4.1
    heritage: metalk8s
  name: node-problem-detector
  namespace: metalk8s-monitoring
spec:
  selector:
    matchLabels:
      app: node-problem-detector
      app.kubernetes.io/instance: node-problem-detector
      app.kubernetes.io/name: node-problem-detector
  template:
    metadata:
      annotations:
        checksum/config: f5483564dad34fe639a87c95b6161b46945292df64abbdc487b3268e32f51524
      labels:
        app: node-problem-detector
        app.kubernetes.io/instance: node-problem-detector
        app.kubernetes.io/name: node-problem-detector
    spec:
      containers:
      - command:
        - /bin/sh
        - -c
        - 'exec /node-problem-detector --logtostderr --config.system-log-monitor=/config/kernel-monitor.json,/config/readonly-monitor.json
          --config.custom-plugin-monitor=/custom-config/wp-monitor.json --prometheus-address=0.0.0.0
          --prometheus-port=20257 --k8s-exporter-heartbeat-period=5m0s  '
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        image: {% endraw -%}{{ build_image_name("node-problem-detector", False) }}{%- raw %}:v1.35.1
        imagePullPolicy: IfNotPresent
        name: node-problem-detector
        ports:
        - containerPort: 20257
          name: exporter
        resources: {}
        securityContext:
          privileged: true
        volumeMounts:
        - mountPath: /var/log/
          name: log
          readOnly: true
        - mountPath: /etc/localtime
          name: localtime
          readOnly: true
        - mountPath: /custom-config
          name: custom-config
          readOnly: true
        - mountPath: /scripts
          name: wp-scripts
          readOnly: true
        - mountPath: /run/wp-monitor
          name: wp-state
      dnsPolicy: ClusterFirst
      hostNetwork: false
      hostPID: false
      hostUsers: true
      priorityClassName: system-node-critical
      serviceAccountName: node-problem-detector
      terminationGracePeriodSeconds: 30
      tolerations:
      - operator: Exists
      volumes:
      - hostPath:
          path: /var/log/
        name: log
      - hostPath:
          path: /etc/localtime
          type: FileOrCreate
        name: localtime
      - configMap:
          defaultMode: 493
          name: node-problem-detector-custom-config
        name: custom-config
      - configMap:
          defaultMode: 493
          name: npd-wp-scripts
        name: wp-scripts
      - emptyDir: {}
        name: wp-state
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/instance: node-problem-detector
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: node-problem-detector
    app.kubernetes.io/part-of: metalk8s
    helm.sh/chart: node-problem-detector-2.4.1
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
  name: node-problem-detector
  namespace: metalk8s-monitoring
spec:
  attachMetadata:
    node: false
  endpoints:
  - interval: 60s
    path: /metrics
    port: exporter
    relabelings:
    - action: replace
      sourceLabels:
      - __meta_kubernetes_pod_node_name
      targetLabel: node
    - action: replace
      sourceLabels:
      - __meta_kubernetes_pod_host_ip
      targetLabel: host_ip
  namespaceSelector:
    matchNames:
    - metalk8s-monitoring
  selector:
    matchLabels:
      app: node-problem-detector

{% endraw %}
