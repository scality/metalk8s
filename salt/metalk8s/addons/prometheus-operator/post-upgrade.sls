# Include here all states that should be called after upgrading

include:
  - .post-cleanup

# NOTE: This can be removed in development/134
# The Thanos chart migration (Banzai Cloud -> Bitnami) renamed the HTTP
# service from thanos-query-http to thanos-query.
Delete old thanos-query-http Service:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: Service
    - name: thanos-query-http
    - namespace: metalk8s-monitoring