{%- from "metalk8s/map.jinja" import repo with context %}

Deploy repo service object:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: repositories
          namespace: kube-system
          labels:
            app: repositories
            app.kubernetes.io/name: repositories
            heritage: metalk8s
            app.kubernetes.io/part-of: metalk8s
            app.kubernetes.io/managed-by: salt
        spec:
          clusterIP: None
          ports:
          - name: http
            port: {{ repo.port }}
            protocol: TCP
            targetPort: http
          selector:
            app.kubernetes.io/name: repositories
          type: ClusterIP

Deploy repo internal service object:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: repositories-internal
          namespace: kube-system
          labels:
            app.kubernetes.io/name: repositories
        spec:
          ports:
          - name: http
            port: 80
            protocol: TCP
            targetPort: http
          selector:
            app.kubernetes.io/name: repositories
          type: ClusterIP
