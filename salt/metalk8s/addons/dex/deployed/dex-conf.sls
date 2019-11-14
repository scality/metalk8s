#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- set oidc_service_ip = salt.metalk8s_network.get_oidc_service_ip() %}

---
apiVersion: v1
kind: Secret
metadata:
  labels:
    app.kubernetes.io/instance: dex
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: dex
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: "2.19.0"
    helm.sh/chart: dex-2.4.0
    heritage: metalk8s
  name: dex
  namespace: metalk8s-auth
stringData:
  config.yaml: |-
      issuer: 'https://{{ oidc_service_ip }}:32000'
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
      frontend:
        theme: "coreos" #metalk8s-ui
        # dir: /web/themes/custom/
      oauth2:
        alwaysShowLoginScreen: false
        skipApprovalScreen: true
      expiry:
        signingKeys: "6h"
        idTokens: "24h"
      staticClients:
      - id: oidc-auth-client
        redirectURIs:
        - 'urn:ietf:wg:oauth:2.0:oob'
        name: 'oidc-auth-client'
        secret: "lkfa9jaf3kfakqyeoikfjakf93k2l"
        trustedPeers:
        - metalk8s-ui
        - grafana-ui
      - id: metalk8s-ui
        redirectURIs:
        - 'https://{{ grains.metalk8s.control_plane_ip }}:8443/oauth2/callback'
        name: 'MetalK8s UI'
        secret: "ybrMJpVMQxsiZw26MhJzCjA2ut"
      - id: grafana-ui
        name: 'Grafana UI'
        redirectURIs:
        - 'https://{{ grains.metalk8s.control_plane_ip }}:8443/grafana/login/generic_oauth'
        secret: "4lqK98NcsWG5qBRHJUqYM1"
      enablePasswordDB: true
      staticPasswords:
      - email: admin@metalk8s.invalid
        hash: $2a$10$2b2cU8CPhOTaGrs1HRQuAueS7JTT5ZHsHSzYiFPm1leZck7Mc8T4W
        userID: 08a8684b-db88-4b73-90a9-3cd1661f5466
        username: admin

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: dex-ca
  namespace: default
type: Opaque
data:
  ca.crt: "{{ salt['hashutil.base64_encodefile']('/etc/kubernetes/pki/dex-ca.crt') | replace("\n", "") }}"
