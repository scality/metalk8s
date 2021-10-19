Delete old prometheus proxy service:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: Service
        - name: prometheus-api
        - namespace: metalk8s-ui
