#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- set prometheus_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/prometheus.yaml',
        saltenv=saltenv
    )
%}
{%- set prometheus = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-prometheus-config', prometheus_defaults
    )
%}
{%- set rules = prometheus.get('spec', {}).get('rules', {}) %}

{%- raw %}
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app.kubernetes.io/part-of: metalk8s
    metalk8s.scality.com/monitor: ''
  name: metalk8s-kube-apps.rules
  namespace: metalk8s-monitoring
spec:
  groups:
  - name: kubernetes-apps
    rules:
    - alert: KubeJobNotCompleted
      annotations:
        description: Job {{ $labels.namespace }}/{{ $labels.job_name }} is taking
          more than {% endraw %}{{ rules.kube_apps.kube_job_not_completed.warning.hours }}{% raw %} hours to complete.
        runbook_url: https://runbooks.prometheus-operator.dev/runbooks/kubernetes/kubejobnotcompleted
        summary: Job did not complete in time
      expr: |-
        time() - max by(namespace, job_name, cluster) (kube_job_status_start_time{job="kube-state-metrics", namespace=~".*"}
          and
        kube_job_status_active{job="kube-state-metrics", namespace=~".*"} > 0) > ({% endraw %}{{ rules.kube_apps.kube_job_not_completed.warning.hours }}{% raw %} * 60 * 60)
      labels:
        severity: warning
{%- endraw %}