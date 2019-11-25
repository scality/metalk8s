Expose Prometheus:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: prometheus
          namespace: metalk8s-monitoring
          labels:
            app: prometheus
            app.kubernetes.io/managed-by: metalk8s
            app.kubernetes.io/name: prometheus
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        spec:
          ports:
          - name: web
            port: 9090
            protocol: TCP
            node_port: 30222
            targetPort: web
          selector:
            app: prometheus
            prometheus: prometheus-operator-prometheus
          type: NodePort
