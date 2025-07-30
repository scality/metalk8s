Create UI Operator Namespace:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Namespace
        metadata:
          name: metalk8s-ui
          labels:
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
