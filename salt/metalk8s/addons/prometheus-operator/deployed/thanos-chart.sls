#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- set thanos_defaults = salt.slsutil.renderer('salt://metalk8s/addons/prometheus-operator/config/thanos.yaml', saltenv=saltenv) %}
{%- set thanos = salt.metalk8s_service_configuration.get_service_conf('metalk8s-monitoring', 'metalk8s-thanos-config', thanos_defaults) %}

{% raw %}

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: {% endraw -%}{{ repo.images.thanos.version }}{%- raw %}
    helm.sh/chart: thanos-17.3.1
    heritage: metalk8s
  name: thanos-query
  namespace: metalk8s-monitoring
spec:
  egress:
  - {}
  ingress:
  - ports:
    - port: 10902
    - port: 10901
    - port: 9090
    - port: 10901
  podSelector:
    matchLabels:
      app.kubernetes.io/component: query
      app.kubernetes.io/instance: thanos
      app.kubernetes.io/name: thanos
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: v1
automountServiceAccountToken: false
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: {% endraw -%}{{ repo.images.thanos.version }}{%- raw %}
    helm.sh/chart: thanos-17.3.1
    heritage: metalk8s
  name: thanos-query
  namespace: metalk8s-monitoring
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: {% endraw -%}{{ repo.images.thanos.version }}{%- raw %}
    helm.sh/chart: thanos-17.3.1
    heritage: metalk8s
  name: thanos-query-grpc
  namespace: metalk8s-monitoring
spec:
  ports:
  - name: grpc
    nodePort: null
    port: 10901
    protocol: TCP
    targetPort: grpc
  selector:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/name: thanos
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: {% endraw -%}{{ repo.images.thanos.version }}{%- raw %}
    helm.sh/chart: thanos-17.3.1
    heritage: metalk8s
  name: thanos-query
  namespace: metalk8s-monitoring
spec:
  ports:
  - name: http
    nodePort: null
    port: 9090
    protocol: TCP
    targetPort: http
  selector:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/name: thanos
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: query
    app.kubernetes.io/instance: thanos
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: thanos
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: {% endraw -%}{{ repo.images.thanos.version }}{%- raw %}
    helm.sh/chart: thanos-17.3.1
    heritage: metalk8s
  name: thanos-query
  namespace: metalk8s-monitoring
spec:
  replicas: 2
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app.kubernetes.io/component: query
      app.kubernetes.io/instance: thanos
      app.kubernetes.io/name: thanos
  strategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app.kubernetes.io/component: query
        app.kubernetes.io/instance: thanos
        app.kubernetes.io/managed-by: salt
        app.kubernetes.io/name: thanos
        app.kubernetes.io/part-of: metalk8s
        app.kubernetes.io/version: {% endraw -%}{{ repo.images.thanos.version }}{%- raw %}
        helm.sh/chart: thanos-17.3.1
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
                  app.kubernetes.io/component: query
                  app.kubernetes.io/instance: thanos
                  app.kubernetes.io/name: thanos
              topologyKey: kubernetes.io/hostname
            weight: 1
      automountServiceAccountToken: false
      containers:
      - args:
        - query
        - --log.level=info
        - --log.format=logfmt
        - --grpc-address=0.0.0.0:10901
        - --http-address=0.0.0.0:10902
        - --query.replica-label=prometheus_replica
        - --store.sd-files=/conf/sd/servicediscovery.yml
        - --endpoint=dnssrv+_grpc._tcp.prometheus-operator-thanos-discovery
        - --alert.query-url=http://thanos-query.metalk8s-monitoring.svc.cluster.local:9090
        - --query.auto-downsampling
        image: {% endraw -%}{{ build_image_name("thanos", False) }}{%- raw %}:v0.41.0
        imagePullPolicy: IfNotPresent
        livenessProbe:
          failureThreshold: 6
          httpGet:
            path: /-/healthy
            port: http
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 30
        name: query
        ports:
        - containerPort: 10902
          name: http
          protocol: TCP
        - containerPort: 10901
          name: grpc
          protocol: TCP
        readinessProbe:
          failureThreshold: 6
          httpGet:
            path: /-/ready
            port: http
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 30
        resources:
          limits:
            cpu: {% endraw -%}{{ thanos.spec.deployment.resources.limits.cpu }}{%- raw %}
            ephemeral-storage: 2Gi
            memory: {% endraw -%}{{ thanos.spec.deployment.resources.limits.memory }}{%- raw %}
          requests:
            cpu: {% endraw -%}{{ thanos.spec.deployment.resources.requests.cpu }}{%- raw %}
            ephemeral-storage: 50Mi
            memory: {% endraw -%}{{ thanos.spec.deployment.resources.requests.memory }}{%- raw %}
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          privileged: false
          readOnlyRootFilesystem: true
          runAsGroup: 1001
          runAsNonRoot: true
          runAsUser: 1001
          seLinuxOptions: {}
          seccompProfile:
            type: RuntimeDefault
        volumeMounts:
        - mountPath: /conf/sd
          name: sd-config
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      securityContext:
        fsGroup: 1001
        fsGroupChangePolicy: Always
        supplementalGroups: []
        sysctls: []
      serviceAccountName: thanos-query
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes:
      - configMap:
          name: thanos-query-sd-files
        name: sd-config

{% endraw %}
