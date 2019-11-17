#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

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
    issuer: {% endraw %}https://{{ grains.metalk8s.control_plane_ip }}:8443/oidc{% raw %}
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
    oauth2:
      alwaysShowLoginScreen: false
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
      - '{% endraw %}https://{{ grains.metalk8s.control_plane_ip }}:8443/oauth2/callback{%
        raw %}'
      secret: ybrMJpVMQxsiZw26MhJzCjA2ut
    - id: grafana-ui
      name: Grafana UI
      redirectURIs:
      - '{% endraw %}https://{{ grains.metalk8s.control_plane_ip }}:8443/grafana/login/generic_oauth{%
        raw %}'
      secret: 4lqK98NcsWG5qBRHJUqYM1
    enablePasswordDB: true
    staticPasswords:
    - email: admin@metalk8s.invalid
      hash: $2a$10$2b2cU8CPhOTaGrs1HRQuAueS7JTT5ZHsHSzYiFPm1leZck7Mc8T4W
      userID: 08a8684b-db88-4b73-90a9-3cd1661f5466
      username: admin
    expiry:
      idTokens: 24h
      signingKeys: 6h
    frontend:
      theme: coreos
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
  clusterIP: '{% endraw %}{{ salt.metalk8s_network.get_oidc_service_ip() }}{% raw
    %}'
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
        checksum/config: 4738fb74fb2066f38bcecbc662c562042d784e5b8e1021dcedcf484dc60393a8
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
        image: '{% endraw %}{{ build_image_name("dex", False) }}{% raw %}:v2.19.0'
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
    nginx.ingress.kubernetes.io/proxy-ssl-secret: dex-ca-cert
    nginx.ingress.kubernetes.io/proxy-ssl-verify: 'on'
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
