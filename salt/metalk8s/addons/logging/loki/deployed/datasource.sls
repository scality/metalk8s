{%- set loki_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/logging/loki/config/loki.yaml', saltenv=saltenv
    )
%}
{%- set loki = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-logging', 'metalk8s-loki-config', loki_defaults
    )
%}

include:
  - metalk8s.addons.prometheus-operator.deployed.namespace

Deploy ConfigMap for Loki datasources:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: loki-grafana-datasource
          namespace: metalk8s-monitoring
          labels:
            grafana_datasource: "1"
            app.kubernetes.io/managed-by: metalk8s
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        data:
          loki-datasource.yaml: |-
            apiVersion: 1
            datasources:
            - name: Loki
              uid: metalk8s-loki
              type: loki
              access: proxy
              url: http://loki.metalk8s-logging.svc:3100/
              version: 1
{%- for index in range(loki.spec.deployment.replicas) %}
            - name: Loki-{{ index }}
              uid: metalk8s-loki-{{ index }}
              type: loki
              access: proxy
              url: http://loki-{{ index }}.metalk8s-logging.svc:3100/
              version: 1
{%- endfor %}
