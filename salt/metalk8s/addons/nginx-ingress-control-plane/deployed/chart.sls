#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}



{% raw %}

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
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
    heritage: metalk8s
  name: ingress-nginx-control-plane
  namespace: metalk8s-ingress
---
apiVersion: v1
data:
  allow-snippet-annotations: 'true'
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
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
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
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
  - namespaces
  verbs:
  - list
  - watch
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
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
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - list
  - watch
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
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
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
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
  - networking.k8s.io
  resources:
  - ingresses
  verbs:
  - get
  - list
  - watch
- apiGroups:
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
  - coordination.k8s.io
  resourceNames:
  - ingress-control-plane-controller-leader
  resources:
  - leases
  verbs:
  - get
  - update
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - create
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - list
  - watch
  - get
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
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
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
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller-metrics
  namespace: metalk8s-ingress
spec:
  ports:
  - name: metrics
    port: 10254
    protocol: TCP
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
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller
  namespace: metalk8s-ingress
spec:
  externalIPs: {% endraw -%}{{ salt.metalk8s_network.get_control_plane_ingress_external_ips() | tojson }}{%- raw %}
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - appProtocol: https
    name: https
    port: 8443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/name: ingress-nginx
  type: ClusterIP
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
    heritage: metalk8s
  name: ingress-nginx-control-plane-controller
  namespace: metalk8s-ingress
spec:
  minReadySeconds: 0
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app.kubernetes.io/component: controller
      app.kubernetes.io/instance: ingress-nginx-control-plane
      app.kubernetes.io/name: ingress-nginx
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
        - --publish-service=$(POD_NAMESPACE)/ingress-nginx-control-plane-controller
        - --election-id=ingress-control-plane-controller-leader
        - --controller-class=k8s.io/ingress-nginx-control-plane
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
        image: '{%- endraw -%}{{ build_image_name("nginx-ingress-controller", False)
          }}{%- raw -%}:v1.6.4'
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
  updateStrategy:
    type: RollingUpdate
---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx-control-plane
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
    heritage: metalk8s
  name: nginx-control-plane
  namespace: metalk8s-ingress
spec:
  controller: k8s.io/ingress-nginx-control-plane
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
    app.kubernetes.io/version: 1.6.4
    helm.sh/chart: ingress-nginx-4.5.2
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
