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
  name: metalk8s-containers.rules
  namespace: metalk8s-monitoring
spec:
  groups:
  - name: container-exporter
    rules:
    - alert: KubeContainerOOMKilled
      annotations:
        description: 'Container {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }}
          on Node {{ $labels.node }} exceeds its memory allocation limit (OOMKilled). Pod accumulates
          a total of {{ printf "%.0f" $value }} restart(s).'
        summary: 'Container killed by exceeding memory allocation limits (OOMKilled).'
      expr: |-
        max_over_time(
          (
            kube_pod_container_status_last_terminated_reason{job="kube-state-metrics", namespace=~".*", reason="OOMKilled"}
            * on (namespace, pod, container) kube_pod_container_status_restarts_total
            * on (namespace, pod) group_left(node) kube_pod_info
          ) [3d:]
        ) > 0
      labels:
        severity: warning
    - alert: KubeContainerOOMKillSurge
      annotations:
        description: 'OOMKill Surge: Container {{ $labels.namespace }}/{{ $labels.pod }}/{{ $labels.container }}
          on Node {{ $labels.node }} exceeds its memory allocation limit (OOMKilled). Pod restarted
          {{ printf "%.0f" $value }} time(s) in last hour.'
        summary: 'OOMKill Surge: Container killed by exceeding memory allocation limits (OOMKilled) in last hour.'
      expr: |-
        round(
          delta(
            (
              kube_pod_container_status_last_terminated_reason{job="kube-state-metrics", namespace=~".*", reason="OOMKilled"}
              * on (namespace, pod, container) kube_pod_container_status_restarts_total
              * on (namespace, pod) group_left(node) kube_pod_info
            ) [61m:]
          ), 1
        ) > 0
      labels:
        severity: critical
{% endraw %}
