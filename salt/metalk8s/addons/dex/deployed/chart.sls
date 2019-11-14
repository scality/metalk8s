#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{% raw %}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.19.0
    helm.sh/chart: dex-2.4.0
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.19.0
    helm.sh/chart: dex-2.4.0
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
rules:
- apiGroups:
  - dex.coreos.com
  resources:
  - '*'
  verbs:
  - '*'
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - create
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.19.0
    helm.sh/chart: dex-2.4.0
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dex
subjects:
- kind: ServiceAccount
  name: dex
  namespace: metalk8s-auth
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/component: dex
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.19.0
    helm.sh/chart: dex-2.4.0
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/component: dex
      app.kubernetes.io/instance: dex
      app.kubernetes.io/name: dex
  strategy:
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 1
    type: RollingUpdate
  template:
    metadata:
      annotations:
        checksum/config: a894c0b2665829c0a0fa94e535679d10e82ea0338ccce0d3c5fe62d965bbe790
      labels:
        app.kubernetes.io/component: dex
        app.kubernetes.io/instance: dex
        app.kubernetes.io/name: dex
    spec:
      containers:
      - command:
        - /usr/local/bin/dex
        - serve
        - /etc/dex/cfg/config.yaml
        env: []
        image: '{%- endraw -%}{{ build_image_name("dex", False) }}{%- raw -%}:v2.19.0'
        imagePullPolicy: IfNotPresent
        name: main
        ports:
        - containerPort: 5556
          name: https
          protocol: TCP
        resources: null
        volumeMounts:
        - mountPath: /etc/dex/cfg
          name: config
        - mountPath: /etc/dex/tls/https/server
          name: https-tls
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      serviceAccountName: dex
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes:
      - name: config
        secret:
          defaultMode: 420
          items:
          - key: config.yaml
            path: config.yaml
          secretName: dex
      - name: https-tls
        secret:
          defaultMode: 420
          secretName: dex-web-server-tls
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx-control-plane
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: 'true'
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.19.0
    helm.sh/chart: dex-2.4.0
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  rules:
  - host: null
    http:
      paths:
      - backend:
          serviceName: dex
          servicePort: 32000
        path: /oidc(/|$)(.*)
  tls:
  - hosts: null
    secretName: dex-tls-ingress

{% endraw %}
