{%- set metalk8s_ui_deployment = salt.metalk8s_kubernetes.get_object(
        kind='Deployment',
        apiVersion='apps/v1',
        namespace='metalk8s-ui',
        name='metalk8s-ui',
  )
%}

{%- if metalk8s_ui_deployment %}

Remove legacy volumes and volumeMounts from metalk8s-ui deployment:
    metalk8s_kubernetes.object_updated:
        - apiVersion: apps/v1
        - kind: Deployment
        - name: metalk8s-ui
        - namespace: metalk8s-ui
        - patch:
            spec:
              template:
                spec:
                  containers:
                  - name: metalk8s-ui
                    volumeMounts:
                    - name: config-volume-metalk8s-ui
                      mountPath: /usr/share/nginx/html/.well-known/configs
                      readOnly: true
                  volumes:
                  - name: config-volume-metalk8s-ui
                    configMap:
                      name: metalk8s-ui-runtime-app-configuration
                      defaultMode: 420
        - content_type: application/merge-patch+json

{%- endif %}

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

# Remove legacy shell-ui configmaps after to avoid interruptions during upgrade

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