include:
  - metalk8s.addons.prometheus-operator.deployed.namespace

Deploy ConfigMap for Loki datasource:
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
