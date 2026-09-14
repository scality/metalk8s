# Include here all states that should be called before upgrading

# NOTE: This can be removed in development/134
# The old Banzai Cloud chart created thanos-query-grpc as a headless service
# (clusterIP: None). The Bitnami chart creates it as a regular ClusterIP
# service. Since clusterIP is immutable, the old one must be deleted first.
Delete old headless thanos-query-grpc Service:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: Service
    - name: thanos-query-grpc
    - namespace: metalk8s-monitoring
