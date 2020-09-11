include:
  - .namespace

{%- set dex_service_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-auth',
        name='metalk8s-dex-config'
  )
%}

{%- if dex_service_config is none %}

Create Dex ServiceConfiguration (metalk8s-auth/metalk8s-dex-config):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-dex-config
          namespace: metalk8s-auth
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha2
            kind: DexConfig
            spec:
              config:
                issuer: https://{{ grains.metalk8s.control_plane_ip }}:8443/oidc

                {#- FIXME: client secrets shouldn't be hardcoded #}
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
                  - https://{{ grains.metalk8s.control_plane_ip }}:8443/oauth2/callback
                  secret: ybrMJpVMQxsiZw26MhJzCjA2ut
                - id: grafana-ui
                  name: Grafana UI
                  redirectURIs:
                  - https://{{ grains.metalk8s.control_plane_ip }}:8443/grafana/login/generic_oauth
                  secret: 4lqK98NcsWG5qBRHJUqYM1

                staticPasswords:
                  - email: "admin@metalk8s.invalid"
                    hash: "$2a$10$2b2cU8CPhOTaGrs1HRQuAueS7JTT5ZHsHSzYiFPm1leZck7Mc8T4W"
                    username: "admin"
                    userID: "08a8684b-db88-4b73-90a9-3cd1661f5466"

 {%- else %}

metalk8s-dex-config ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}
