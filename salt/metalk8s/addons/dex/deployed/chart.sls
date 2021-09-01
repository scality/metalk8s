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
    app.kubernetes.io/version: 2.30.0
    helm.sh/chart: dex-0.6.3
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
    app.kubernetes.io/version: 2.30.0
    helm.sh/chart: dex-0.6.3
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
    app.kubernetes.io/version: 2.30.0
    helm.sh/chart: dex-0.6.3
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
    app.kubernetes.io/version: 2.30.0
    helm.sh/chart: dex-0.6.3
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  clusterIP: {% endraw -%}{{ salt.metalk8s_network.get_oidc_service_ip() }}{%- raw %}
  ports:
  - appProtocol: http
    name: http
    port: 5556
    protocol: TCP
    targetPort: http
  - appProtocol: https
    name: https
    port: 5554
    protocol: TCP
    targetPort: https
  - appProtocol: http
    name: telemetry
    port: 5558
    protocol: TCP
    targetPort: telemetry
  selector:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/name: dex
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.30.0
    helm.sh/chart: dex-0.6.3
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  replicas: {% endraw -%}{{ dex.spec.deployment.replicas }}{%- raw %}
  selector:
    matchLabels:
      app.kubernetes.io/instance: dex
      app.kubernetes.io/name: dex
  template:
    metadata:
      annotations:
        checksum/config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="Secret",
          apiVersion="v1", namespace="metalk8s-auth", name="dex", path="data:config.yaml")
      labels:
        app.kubernetes.io/instance: dex
        app.kubernetes.io/name: dex
    spec:
      containers:
      - args:
        - dex
        - serve
        - --web-http-addr
        - 0.0.0.0:5556
        - --web-https-addr
        - 0.0.0.0:5554
        - --telemetry-addr
        - 0.0.0.0:5558
        - /etc/dex/config.yaml
        env:
        - name: KUBERNETES_POD_NAMESPACE
          value: metalk8s-auth
        image: {% endraw -%}{{ build_image_name("dex", False) }}{%- raw %}:v2.30.0
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /healthz/live
            port: telemetry
        name: dex
        ports:
        - containerPort: 5556
          name: http
          protocol: TCP
        - containerPort: 5554
          name: https
          protocol: TCP
        - containerPort: 5558
          name: telemetry
          protocol: TCP
        readinessProbe:
          httpGet:
            path: /healthz/ready
            port: telemetry
        resources: {}
        securityContext: {}
        volumeMounts:
        - mountPath: /etc/dex
          name: config
          readOnly: true
        - mountPath: /etc/dex/tls/https/server
          name: https-tls
        - mountPath: /srv/dex/web/themes/scality
          name: dex-login
        - mountPath: /etc/ssl/certs/nginx-ingress-ca.crt
          name: nginx-ingress-ca-cert
          subPath: ca.crt
      nodeSelector:
        node-role.kubernetes.io/infra: ''
      securityContext: {}
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
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 2.30.0
    helm.sh/chart: dex-0.6.3
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
spec:
  ingressClassName: nginx-control-plane
  rules:
  - host: null
    http:
      paths:
      - backend:
          service:
            name: dex
            port:
              number: 5554
        path: /oidc
        pathType: Prefix

{% endraw %}
