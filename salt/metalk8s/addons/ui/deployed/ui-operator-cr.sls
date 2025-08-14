{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set metalk8s_ui_image = build_image_name('metalk8s-ui') %}

{%- set metalk8s_ui_component = salt.metalk8s_kubernetes.get_object(
        kind='ScalityUIComponent',
        apiVersion='ui.scality.com/v1alpha1',
        namespace='metalk8s-ui',
        name='metalk8s-ui',
  )
%}

{%- if metalk8s_ui_component is none %}

Create metalk8s-ui ScalityUIComponent:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: ui.scality.com/v1alpha1
        kind: ScalityUIComponent
        metadata:
          name: metalk8s-ui
          namespace: metalk8s-ui
        spec:
          image: {{ metalk8s_ui_image }}
          mountPath: /usr/share/nginx/html/.well-known

{%- else %}

Update metalk8s-ui ScalityUIComponent:
  metalk8s_kubernetes.object_updated:
    - name: metalk8s-ui
    - kind: ScalityUIComponent
    - apiVersion: ui.scality.com/v1alpha1
    - namespace: metalk8s-ui
    - patch:
        spec:
          image: {{ metalk8s_ui_image }}
    - content_type: application/merge-patch+json
{%- endif %}


{%- set metalk8s_ui_exposer = salt.metalk8s_kubernetes.get_object(
        kind='ScalityUIComponentExposer',
        apiVersion='ui.scality.com/v1alpha1',
        namespace='metalk8s-ui',
        name='metalk8s-ui-exposer',
  )
%}

{%- if metalk8s_ui_exposer is none %}

Create metalk8s-ui-exposer ScalityUIComponentExposer:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: ui.scality.com/v1alpha1
        kind: ScalityUIComponentExposer
        metadata:
          name: metalk8s-ui-exposer
          namespace: metalk8s-ui
        spec:
          scalityUI: "shell-ui-cp"
          scalityUIComponent: "metalk8s-ui"
          appHistoryBasePath: "/platform"
          selfConfiguration:
            flags: []
            ui_base_path: ""
            url: /api/kubernetes
            url_alertmanager: /api/alertmanager
            url_doc: /docs
            url_grafana: /grafana
            url_loki: /api/loki
            url_prometheus: /api/prometheus
            url_salt: /api/salt
            url_support: https://github.com/scality/metalk8s/discussions/new
{%- else %}

metalk8s-ui-exposer ScalityUIComponentExposer already exists:
  test.succeed_without_changes: []

{%- endif %}