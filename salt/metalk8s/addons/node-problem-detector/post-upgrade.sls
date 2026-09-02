# Include here all states that should be called after upgrading

# NOTE: This can be removed in development/135, 133 releases ship the ConfigMap
# so an upgrade to 134 still has to clean it up
# The workload plane probe used to read its peer list from this ConfigMap, it
# now discovers the peers through the headless node-problem-detector Service
Delete the obsolete npd-wp-peers ConfigMap:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ConfigMap
    - name: npd-wp-peers
    - namespace: metalk8s-monitoring
