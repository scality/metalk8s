{%- set loki_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/logging/loki/config/loki.yaml', saltenv=saltenv
    )
%}
{%- set loki = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-logging', 'metalk8s-loki-config', loki_defaults
    )
%}

{%- for index in range(loki.spec.deployment.replicas) %}
Delete old loki-{{ index }} service object:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: Service
    - name: loki-{{ index }}
    - namespace: metalk8s-logging
{%- endfor %}
