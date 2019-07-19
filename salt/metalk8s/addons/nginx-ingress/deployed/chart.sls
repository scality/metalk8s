#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: metalk8s-ingress
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
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
  - update
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
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: metalk8s-ingress
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nginx-ingress
subjects:
- kind: ServiceAccount
  name: nginx-ingress
  namespace: metalk8s-ingress
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
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
  - update
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
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress
  namespace: metalk8s-ingress
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: nginx-ingress
subjects:
- kind: ServiceAccount
  name: nginx-ingress
  namespace: metalk8s-ingress
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
    chart: nginx-ingress-1.10.2
    component: controller
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-controller
  namespace: metalk8s-ingress
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
  type: ClusterIP
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
    chart: nginx-ingress-1.10.2
    component: default-backend
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-default-backend
  namespace: metalk8s-ingress
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
kind: DaemonSet
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: metalk8s
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    component: controller
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-controller
  namespace: metalk8s-ingress
spec:
  minReadySeconds: 0
  revisionHistoryLimit: 10
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
        - --default-backend-service=metalk8s-ingress/nginx-ingress-default-backend
        - --election-id=ingress-controller-leader
        - --ingress-class=nginx
        - --configmap=metalk8s-ingress/nginx-ingress-controller
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        image: '{{ build_image_name("nginx-ingress-controller") }}:0.25.0'
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
          hostPort: 80
          name: http
          protocol: TCP
        - containerPort: 443
          hostPort: 443
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
      serviceAccountName: nginx-ingress
      terminationGracePeriodSeconds: 60
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
  updateStrategy: {}
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
    chart: nginx-ingress-1.10.2
    component: default-backend
    heritage: metalk8s
    release: nginx-ingress
  name: nginx-ingress-default-backend
  namespace: metalk8s-ingress
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
        image: '{{ build_image_name("nginx-ingress-defaultbackend-amd64") }}:1.5'
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
        name: nginx-ingress-default-backend
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
        resources: {}
        securityContext:
          runAsUser: 65534
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      terminationGracePeriodSeconds: 60
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
