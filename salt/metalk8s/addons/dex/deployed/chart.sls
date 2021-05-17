#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{% set dex_defaults = salt.slsutil.renderer('salt://metalk8s/addons/dex/config/dex.yaml.j2', saltenv=saltenv) %}
{%- set dex = salt.metalk8s_service_configuration.get_service_conf('metalk8s-auth', 'metalk8s-dex-config', dex_defaults) %}

{% raw %}

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.24.0
    helm.sh/chart: dex-2.15.2
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
    app.kubernetes.io/version: 2.24.0
    helm.sh/chart: dex-2.15.2
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
    app.kubernetes.io/version: 2.24.0
    helm.sh/chart: dex-2.15.2
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
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.24.0
    helm.sh/chart: dex-2.15.2
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  clusterIP: {% endraw -%}{{ salt.metalk8s_network.get_oidc_service_ip() }}{%- raw %}
  ports:
  - name: https
    port: 32000
    targetPort: https
  - name: telemetry
    port: 37000
    targetPort: telemetry
  selector:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/name: dex
  sessionAffinity: None
  type: ClusterIP
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
    app.kubernetes.io/version: 2.24.0
    helm.sh/chart: dex-2.15.2
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  replicas: {% endraw -%}{{ dex.spec.deployment.replicas }}{%- raw %}
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
        checksum/config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="Secret",
          apiVersion="v1", namespace="metalk8s-auth", name="dex", path="data:config.yaml")
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
        env:
        - name: KUBERNETES_POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        image: {% endraw -%}{{ build_image_name("dex", False) }}{%- raw %}:v2.28.1
        imagePullPolicy: IfNotPresent
        name: main
        ports:
        - containerPort: 5556
          name: https
          protocol: TCP
        - containerPort: 5558
          name: telemetry
          protocol: TCP
        resources: null
        volumeMounts:
        - mountPath: /etc/dex/cfg
          name: config
        - mountPath: /etc/dex/tls/https/server
          name: https-tls
        - mountPath: /web/themes/scality
          name: dex-login
        - mountPath: /etc/ssl/certs/nginx-ingress-ca.crt
          name: nginx-ingress-ca-cert
          subPath: ca.crt
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
      - configMap:
          name: dex-login
        name: dex-login
      - configMap:
          name: nginx-ingress-ca-cert
        name: nginx-ingress-ca-cert
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx-control-plane
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.24.0
    helm.sh/chart: dex-2.15.2
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
        path: /oidc

{% endraw %}
