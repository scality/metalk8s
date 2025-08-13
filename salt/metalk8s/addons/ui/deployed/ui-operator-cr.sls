#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set metalk8s_ui_image = build_image_name('metalk8s-ui') %}

apiVersion: ui.scality.com/v1alpha1
kind: ScalityUIComponent
metadata:
  name: metalk8s-ui
  namespace: metalk8s-ui
spec:
  image: {{ metalk8s_ui_image }}
  mountPath: /usr/share/nginx/html/.well-known

---

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