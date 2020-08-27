include:
  - .namespace

{%- set dex_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-auth',
        name='metalk8s-dex-config'
  )
%}

{%- if dex_config is none %}

Create dex-config ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-dex-config
          namespace: metalk8s-auth
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com
            kind: DexConfig
            spec:
              localuserstore:
                enabled: true
                userlist:
                  - email: "admin@metalk8s.invalid"
                    hash: "$2a$10$2b2cU8CPhOTaGrs1HRQuAueS7JTT5ZHsHSzYiFPm1leZck7Mc8T4W"
                    username: "admin"
                    userID: "08a8684b-db88-4b73-90a9-3cd1661f5466"
              externalIDP:
                staticClient:
                  name: ""
                  redirectURIs: []


 {%- else %}

metalk8s-dex-config ConfigMap already exist:
  test.succeed_without_changes: []

{%- endif %}
