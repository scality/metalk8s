{%- set loki_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/logging/loki/config/loki.yaml', saltenv=saltenv
    )
%}
{%- set loki = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-logging', 'metalk8s-loki-config', loki_defaults
    )
%}

{%- for index in range(loki.spec.deployment.replicas) %}
Deploy loki-{{ index }} service object:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: loki-{{ index }}
          namespace: metalk8s-logging
          labels:
            app: loki
            app.kubernetes.io/name: loki
            app.kubernetes.io/part-of: metalk8s
        spec:
          clusterIP: None
          ports:
            - name: http-metrics
              port: 3100
              protocol: TCP
              targetPort: http-metrics
          selector:
            app.kubernetes.io/instance: loki
            app.kubernetes.io/name: loki
            statefulset.kubernetes.io/pod-name: loki-{{ index }}
          type: ClusterIP
{%- endfor %}
