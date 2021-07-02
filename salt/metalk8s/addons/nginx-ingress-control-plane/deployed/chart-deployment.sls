#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

apiVersion: policy/v1beta1
kind: PodDisruptionBudget
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller
  namespace: metalk8s-ingress
spec:
  minAvailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/component: controller
      app.kubernetes.io/instance: ingress-nginx-control-plane
      app.kubernetes.io/name: ingress-nginx
---
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
---
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: default-backend
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-backend
  namespace: metalk8s-ingress
---
apiVersion: v1
data: null
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller
  namespace: metalk8s-ingress
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
rules:
- apiGroups:
  - ''
  resources:
  - configmaps
  - endpoints
  - nodes
  - pods
  - secrets
  verbs:
  - list
  - watch
- apiGroups:
  - ''
  resources:
  - nodes
  verbs:
  - get
- apiGroups:
  - ''
  resources:
  - services
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - extensions
  - networking.k8s.io
  resources:
  - ingresses
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
  - extensions
  - networking.k8s.io
  resources:
  - ingresses/status
  verbs:
  - update
- apiGroups:
  - networking.k8s.io
  resources:
  - ingressclasses
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ingress-nginx-control-plane
subjects:
- kind: ServiceAccount
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
rules:
- apiGroups:
  - ''
  resources:
  - namespaces
  verbs:
  - get
- apiGroups:
  - ''
  resources:
  - configmaps
  - pods
  - secrets
  - endpoints
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ''
  resources:
  - services
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - extensions
  - networking.k8s.io
  resources:
  - ingresses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - extensions
  - networking.k8s.io
  resources:
  - ingresses/status
  verbs:
  - update
- apiGroups:
  - networking.k8s.io
  resources:
  - ingressclasses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ''
  resourceNames:
  - ingress-control-plane-controller-leader-nginx-control-plane
  resources:
  - configmaps
  verbs:
  - get
  - update
- apiGroups:
  - ''
  resources:
  - configmaps
  verbs:
  - create
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
  - patch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ingress-nginx-control-plane
subjects:
- kind: ServiceAccount
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller-metrics
  namespace: metalk8s-ingress
spec:
  ports:
  - name: metrics
    port: 10254
    targetPort: metrics
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/name: ingress-nginx
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  annotations: null
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller
  namespace: metalk8s-ingress
spec:
  externalTrafficPolicy: Local
  loadBalancerIP: {% endraw -%}{{ salt.metalk8s_network.get_control_plane_ingress_ip() }}{%- raw %}
  ports:
  - name: https
    port: 8443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/name: ingress-nginx
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: default-backend
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-defaultbackend
  namespace: metalk8s-ingress
spec:
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: http
  selector:
    app.kubernetes.io/component: default-backend
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/name: ingress-nginx
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller
  namespace: metalk8s-ingress
spec:
  minReadySeconds: 0
  replicas: 2
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app.kubernetes.io/component: controller
      app.kubernetes.io/instance: ingress-nginx-control-plane
      app.kubernetes.io/name: ingress-nginx
  strategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app.kubernetes.io/component: controller
        app.kubernetes.io/instance: ingress-nginx-control-plane
        app.kubernetes.io/name: ingress-nginx
    spec:
      containers:
      - args:
        - /nginx-ingress-controller
        - --default-backend-service=$(POD_NAMESPACE)/ingress-nginx-control-plane-defaultbackend
        - --publish-service=$(POD_NAMESPACE)/ingress-nginx-control-plane-controller
        - --election-id=ingress-control-plane-controller-leader
        - --ingress-class=nginx-control-plane
        - --configmap=$(POD_NAMESPACE)/ingress-nginx-control-plane-controller
        - --default-ssl-certificate=metalk8s-ingress/ingress-control-plane-default-certificate
        - --metrics-per-host=false
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: LD_PRELOAD
          value: /usr/local/lib/libmimalloc.so
        image: {% endraw -%}{{ build_image_name("nginx-ingress-controller", False) }}{%- raw %}:v0.47.0
        imagePullPolicy: IfNotPresent
        lifecycle:
          preStop:
            exec:
              command:
              - /wait-shutdown
        livenessProbe:
          failureThreshold: 5
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        name: controller
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        - containerPort: 443
          name: https
          protocol: TCP
        - containerPort: 10254
          name: metrics
          protocol: TCP
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        resources:
          requests:
            cpu: 100m
            memory: 90Mi
        securityContext:
          allowPrivilegeEscalation: true
          capabilities:
            add:
            - NET_BIND_SERVICE
            drop:
            - ALL
          runAsUser: 101
      dnsPolicy: ClusterFirst
      nodeSelector:
        kubernetes.io/os: linux
        node-role.kubernetes.io/master: ''
      serviceAccountName: ingress-nginx-control-plane
      terminationGracePeriodSeconds: 300
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
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: default-backend
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
  name: ingress-nginx-control-plane-defaultbackend
  namespace: metalk8s-ingress
spec:
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app.kubernetes.io/component: default-backend
      app.kubernetes.io/instance: ingress-nginx-control-plane
      app.kubernetes.io/name: ingress-nginx
  template:
    metadata:
      labels:
        app.kubernetes.io/component: default-backend
        app.kubernetes.io/instance: ingress-nginx-control-plane
        app.kubernetes.io/name: ingress-nginx
    spec:
      containers:
      - image: {% endraw -%}{{ build_image_name("nginx-ingress-defaultbackend-amd64", False) }}{%- raw %}:1.5
        imagePullPolicy: IfNotPresent
        livenessProbe:
          failureThreshold: 3
          httpGet:
            path: /healthz
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 5
        name: ingress-nginx-default-backend
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        readinessProbe:
          failureThreshold: 6
          httpGet:
            path: /healthz
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 0
          periodSeconds: 5
          successThreshold: 1
          timeoutSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 65534
      nodeSelector:
        node-role.kubernetes.io/master: ''
      serviceAccountName: ingress-nginx-control-plane-backend
      terminationGracePeriodSeconds: 60
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
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 0.47.0
    helm.sh/chart: ingress-nginx-3.34.0
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
  name: ingress-nginx-control-plane-controller
  namespace: metalk8s-ingress
spec:
  endpoints:
  - interval: 30s
    port: metrics
  namespaceSelector:
    matchNames:
    - metalk8s-ingress
  selector:
    matchLabels:
      app.kubernetes.io/component: controller
      app.kubernetes.io/instance: ingress-nginx-control-plane
      app.kubernetes.io/name: ingress-nginx

{% endraw %}
