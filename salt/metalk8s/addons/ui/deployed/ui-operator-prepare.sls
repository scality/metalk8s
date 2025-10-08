# This can file can be removed in v132.0.0

Delete old metalk8s-ui deployment:
    metalk8s_kubernetes.object_absent:
        - apiVersion: apps/v1
        - kind: Deployment
        - name: metalk8s-ui
        - namespace: metalk8s-ui

Delete old metalk8s-ui service:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: Service
        - name: metalk8s-ui
        - namespace: metalk8s-ui

Delete old metalk8s-ui ingress:
    metalk8s_kubernetes.object_absent:
        - apiVersion: networking.k8s.io/v1
        - kind: Ingress
        - name: metalk8s-ui
        - namespace: metalk8s-ui

Delete old metalk8s-shell-ui-config configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: metalk8s-shell-ui-config
        - namespace: metalk8s-ui

Delete old metalk8s-ui configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: metalk8s-ui
        - namespace: metalk8s-ui

Delete old metalk8s-ui-config configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: metalk8s-ui-config
        - namespace: metalk8s-ui
