# This can file can be removed in v132.0.0

Delete old shell-ui configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: shell-ui-config
        - namespace: metalk8s-ui

Delete legacy deployed-ui-apps configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: deployed-ui-apps
        - namespace: metalk8s-ui

Delete legacy deployed-ui-apps-generated configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: deployed-ui-apps-generated
        - namespace: metalk8s-ui

Delete legacy shell-ui configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: shell-ui
        - namespace: metalk8s-ui

Delete legacy workloadplane-shell-ui-config configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: workloadplane-shell-ui-config
        - namespace: metalk8s-ui

Delete legacy workloadplane-shell-ui-config-generated configmap:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: ConfigMap
        - name: workloadplane-shell-ui-config-generated
        - namespace: metalk8s-ui