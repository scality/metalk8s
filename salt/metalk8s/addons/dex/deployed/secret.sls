{%- set dex_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/dex/config/dex.yaml.j2', saltenv=saltenv
    )
%}

{%- set dex = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-auth', 'metalk8s-dex-config', dex_defaults
    )
%}

Create Dex configuration Secret:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Secret
        metadata:
          labels:
            app.kubernetes.io/instance: dex
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/name: dex
            app.kubernetes.io/part-of: metalk8s
            app.kubernetes.io/version: 2.23.0
            helm.sh/chart: dex-2.10.0
            heritage: metalk8s
          name: dex
          namespace: metalk8s-auth
        stringData:
          config.yaml: |-
            {{ dex.spec.config | yaml(False) | indent(12) }}
