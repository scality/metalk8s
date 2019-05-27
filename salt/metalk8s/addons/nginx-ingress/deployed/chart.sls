#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_repo with context %}
apiVersion: v1
data:
  enable-vts-status: 'false'
kind: ConfigMap
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    component: controller
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-controller
  namespace: nginx-ingress-system
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: nginx-ingress-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: nginx-ingress-system
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
  - update
  - watch
- apiGroups:
  - extensions
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
  resources:
  - ingresses/status
  verbs:
  - update
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: nginx-ingress-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nginx-ingress
subjects:
- kind: ServiceAccount
  name: nginx-ingress
  namespace: nginx-ingress-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: nginx-ingress-system
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
  - update
  - watch
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - extensions
  resources:
  - ingresses/status
  verbs:
  - update
- apiGroups:
  - ''
  resourceNames:
  - ingress-controller-leader-nginx
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
  - endpoints
  verbs:
  - create
  - get
  - update
- apiGroups:
  - ''
  resources:
  - events
  verbs:
  - create
  - patch
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: RoleBinding
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: nginx-ingress-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: nginx-ingress
subjects:
- kind: ServiceAccount
  name: nginx-ingress
  namespace: nginx-ingress-system
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    component: controller
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-controller
  namespace: nginx-ingress-system
spec:
  clusterIP: ''
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: http
  - name: https
    port: 443
    protocol: TCP
    targetPort: https
  selector:
    app: nginx-ingress
    component: controller
    release: nginx-ingress
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: default-backend
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    component: default-backend
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-default-backend
  namespace: nginx-ingress-system
spec:
  clusterIP: ''
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: http
  selector:
    app: nginx-ingress
    component: default-backend
    release: nginx-ingress
  type: ClusterIP
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    component: controller
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-controller
  namespace: nginx-ingress-system
spec:
  minReadySeconds: 0
  replicas: 1
  revisionHistoryLimit: 10
  strategy: {}
  template:
    metadata:
      labels:
        app: nginx-ingress
        component: controller
        release: nginx-ingress
    spec:
      containers:
      - args:
        - /nginx-ingress-controller
        - --default-backend-service=nginx-ingress-system/nginx-ingress-default-backend
        - --publish-service=nginx-ingress-system/nginx-ingress-controller
        - --election-id=ingress-controller-leader
        - --ingress-class=nginx
        - --configmap=nginx-ingress-system/nginx-ingress-controller
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        image: '{{ build_image_repo("nginx-ingress-controller") }}:0.24.1'
        imagePullPolicy: IfNotPresent
        livenessProbe:
          failureThreshold: 3
          httpGet:
            path: /healthz
            port: 10254
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 10
          successThreshold: 1
          timeoutSeconds: 1
        name: nginx-ingress-controller
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        - containerPort: 443
          name: https
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
        resources: {}
        securityContext:
          capabilities:
            add:
            - NET_BIND_SERVICE
            drop:
            - ALL
          runAsUser: 33
      dnsPolicy: ClusterFirst
      hostNetwork: false
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      serviceAccountName: nginx-ingress
      terminationGracePeriodSeconds: 60
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: default-backend
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.6.13
    component: default-backend
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-default-backend
  namespace: nginx-ingress-system
spec:
  replicas: 1
  revisionHistoryLimit: 10
  template:
    metadata:
      labels:
        app: nginx-ingress
        component: default-backend
        release: nginx-ingress
    spec:
      containers:
      - args: null
        image: '{{ build_image_repo("nginx-ingress-defaultbackend-amd64") }}:1.5'
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 30
          timeoutSeconds: 5
        name: nginx-ingress-default-backend
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        resources: {}
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      serviceAccountName: nginx-ingress
      terminationGracePeriodSeconds: 60
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
