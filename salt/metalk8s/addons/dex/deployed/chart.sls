#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- set dex = salt.metalk8s_service_configuration.get_service_conf('metalk8s-auth', 'metalk8s-dex-config') %}

{% raw %}

apiVersion: v1
kind: Secret
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
stringData:
  config.yaml: |-
    issuer: "{% endraw -%}https://{{ grains.metalk8s.control_plane_ip }}:8443/oidc{%- raw %}"
    storage:
      config:
        inCluster: true
      type: kubernetes
    logger:
      level: debug
    web:
      https: 0.0.0.0:5556
      tlsCert: /etc/dex/tls/https/server/tls.crt
      tlsKey: /etc/dex/tls/https/server/tls.key
    connectors:
      {% endraw -%}{{ dex.spec.connectors | tojson }}{%- raw %}
    oauth2:
      alwaysShowLoginScreen: true
      responseTypes:
      - code
      - token
      - id_token
      skipApprovalScreen: true
    staticClients:
    - id: oidc-auth-client
      name: oidc-auth-client
      redirectURIs:
      - urn:ietf:wg:oauth:2.0:oob
      secret: lkfa9jaf3kfakqyeoikfjakf93k2l
      trustedPeers:
      - metalk8s-ui
      - grafana-ui
    - id: metalk8s-ui
      name: MetalK8s UI
      redirectURIs:
      - "{% endraw -%}https://{{ grains.metalk8s.control_plane_ip }}:8443/oauth2/callback{%- raw %}"
      secret: ybrMJpVMQxsiZw26MhJzCjA2ut
    - id: grafana-ui
      name: Grafana UI
      redirectURIs:
      - "{% endraw -%}https://{{ grains.metalk8s.control_plane_ip }}:8443/grafana/login/generic_oauth{%- raw %}"
      secret: 4lqK98NcsWG5qBRHJUqYM1
    enablePasswordDB: {% endraw -%}{{ dex.spec.localuserstore.enabled }}{%- raw %}
    staticPasswords:
      {% endraw -%}{{ dex.spec.localuserstore.userlist | tojson }}{%- raw %}
    expiry:
      idTokens: 24h
      signingKeys: 6h
    frontend:
      issuer: MetalK8s
      theme: scality
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
apiVersion: v1
kind: Service
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
spec:
  clusterIP: {% endraw -%}{{ salt.metalk8s_network.get_oidc_service_ip() }}{%- raw %}
  ports:
  - name: https
    port: 32000
    targetPort: https
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
    app.kubernetes.io/version: 2.19.0
    helm.sh/chart: dex-2.4.0
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
        checksum/config: ad6c30825bdc913fdb7dd6486fd137e443001efd3f183aa7ae13f013bc6f6c38
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
        image: {% endraw -%}{{ build_image_name("dex", False) }}{%- raw %}:v2.19.0
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
        - mountPath: /web/themes/scality
          name: dex-login
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
        path: /oidc

{% endraw %}
