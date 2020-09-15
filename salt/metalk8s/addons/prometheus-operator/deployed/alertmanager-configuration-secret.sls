{%- set alertmanager_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/alertmanager.yaml',
        saltenv=saltenv
    )
%}

{%- set alertmanager = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-alertmanager-config', alertmanager_defaults
    )
%}

Create Alertmanager Configuration Secret:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Secret
        metadata:
          labels:
            app: prometheus-operator-alertmanager
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/name: prometheus-operator-alertmanager
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
            release: prometheus-operator
          name: alertmanager-prometheus-operator-alertmanager
          namespace: metalk8s-monitoring
        stringData:
          alertmanager.yaml: |-
            {{ alertmanager.spec.notification.config | tojson }}
