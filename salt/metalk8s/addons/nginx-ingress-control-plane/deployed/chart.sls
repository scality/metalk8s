#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{% raw %}

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress-control-plane
  name: nginx-ingress-control-plane
  namespace: metalk8s-ingress
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress-control-plane
  name: nginx-ingress-control-plane
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
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress-control-plane
  name: nginx-ingress-control-plane
  namespace: metalk8s-ingress
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nginx-ingress-control-plane
subjects:
- kind: ServiceAccount
  name: nginx-ingress-control-plane
  namespace: metalk8s-ingress
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: Role
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress-control-plane
  name: nginx-ingress-control-plane
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
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    heritage: metalk8s
    release: nginx-ingress-control-plane
  name: nginx-ingress-control-plane
  namespace: metalk8s-ingress
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: nginx-ingress-control-plane
subjects:
- kind: ServiceAccount
  name: nginx-ingress-control-plane
  namespace: metalk8s-ingress
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    component: controller
    heritage: metalk8s
    release: nginx-ingress-control-plane
  name: nginx-ingress-control-plane-controller
  namespace: metalk8s-ingress
spec:
  clusterIP: ''
  externalIPs:
  - '{%- endraw -%}{{ grains.metalk8s.control_plane_ip }}{%- raw -%}'
  ports:
  - name: https
    port: 8443
    protocol: TCP
    targetPort: https
  selector:
    app: nginx-ingress
    component: controller
    release: nginx-ingress-control-plane
  type: ClusterIP
---
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  labels:
    app: nginx-ingress
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: nginx-ingress
    app.kubernetes.io/part-of: metalk8s
    chart: nginx-ingress-1.10.2
    component: controller
    heritage: metalk8s
    release: nginx-ingress-control-plane
  name: nginx-ingress-control-plane-controller
  namespace: metalk8s-ingress
spec:
  minReadySeconds: 0
  revisionHistoryLimit: 10
  template:
    metadata:
      labels:
        app: nginx-ingress
        component: controller
        release: nginx-ingress-control-plane
    spec:
      containers:
      - args:
        - /nginx-ingress-controller
        - --default-backend-service=metalk8s-ingress/nginx-ingress-default-backend
        - --election-id=ingress-control-plane-controller-leader
        - --ingress-class=nginx-control-plane
        - --configmap=metalk8s-ingress/nginx-ingress-control-plane-controller
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        image: '{%- endraw -%}{{ build_image_name("nginx-ingress-controller", False)
          }}{%- raw -%}:0.25.0'
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
        node-role.kubernetes.io/master: ''
      serviceAccountName: nginx-ingress-control-plane
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
  updateStrategy:
    type: RollingUpdate

{% endraw %}
