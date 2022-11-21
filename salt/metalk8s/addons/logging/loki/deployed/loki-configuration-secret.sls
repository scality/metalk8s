{%- set loki_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/logging/loki/config/loki.yaml', saltenv=saltenv
    )
%}

{%- set loki = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-logging', 'metalk8s-loki-config', loki_defaults
    )
%}

{%- if "replication_factor" not in loki.spec.config.ingester.lifecycler.ring %}
  {%- do loki.spec.config.ingester.lifecycler.ring.update(
    {"replication_factor": (loki.spec.deployment.replicas / 2) | int + 1}
  ) %}
{%- endif %}

Create Loki Configuration Secret:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Secret
        metadata:
          labels:
            app: loki
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/name: loki
            app.kubernetes.io/part-of: metalk8s
            chart: loki-0.30.2
            heritage: metalk8s
            release: loki
          name: loki
          namespace: metalk8s-logging
        stringData:
          config.yaml: |-
            {{ loki.spec.config | tojson }}
