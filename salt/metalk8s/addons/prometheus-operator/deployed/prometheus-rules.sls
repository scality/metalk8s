#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{% import_yaml 'metalk8s/addons/prometheus-operator/config/prometheus.yaml'
    as prometheus_defaults with context
%}
{%- set prometheus = salt.metalk8s_service_configuration.get_service_conf(
    'metalk8s-monitoring', 'metalk8s-prometheus-config', prometheus_defaults
) %}
{%- set rules = prometheus.get('spec', {}).get('rules', {}) %}

{%- raw %}
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app: prometheus-operator
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-operator
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-operator-8.1.2
    heritage: metalk8s
    release: prometheus-operator
  name: prometheus-operator-node-exporter
  namespace: metalk8s-monitoring
spec:
  groups:
  - name: node-exporter
    rules:
    - alert: NodeFilesystemSpaceFillingUp
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available space left and is filling
          up.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemspacefillingup
        summary: Filesystem is predicted to run out of space within the next {% endraw %}{{ rules.node_exporter.node_filesystem_space_filling_up.warning.hours }}{% raw %} hours.
      expr: |-
        (
          node_filesystem_avail_bytes{job="node-exporter",fstype!=""} / node_filesystem_size_bytes{job="node-exporter", fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_space_filling_up.warning.threshold }}{% raw %}
        and
          predict_linear(node_filesystem_avail_bytes{job="node-exporter",fstype!=""}[6h], {% endraw %}{{ rules.node_exporter.node_filesystem_space_filling_up.warning.hours }}{% raw %}*60*60) < 0
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: warning
    - alert: NodeFilesystemSpaceFillingUp
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available space left and is filling
          up fast.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemspacefillingup
        summary: Filesystem is predicted to run out of space within the next {% endraw %}{{ rules.node_exporter.node_filesystem_space_filling_up.critical.hours }}{% raw %} hours.
      expr: |-
        (
          node_filesystem_avail_bytes{job="node-exporter",fstype!=""} / node_filesystem_size_bytes{job="node-exporter", fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_space_filling_up.critical.threshold }}{% raw %}
        and
          predict_linear(node_filesystem_avail_bytes{job="node-exporter",fstype!=""}[6h], {% endraw %}{{ rules.node_exporter.node_filesystem_space_filling_up.critical.hours }}{% raw %}*60*60) < 0
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: critical
    - alert: NodeFilesystemAlmostOutOfSpace
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available space left.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace
        summary: Filesystem has less than {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_space.warning.available }}{% raw %}% space left.
      expr: |-
        (
          node_filesystem_avail_bytes{job="node-exporter",fstype!=""} / node_filesystem_size_bytes{job="node-exporter",fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_space.warning.available }}{% raw %}
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: warning
    - alert: NodeFilesystemAlmostOutOfSpace
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available space left.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace
        summary: Filesystem has less than {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_space.critical.available }}{% raw %}% space left.
      expr: |-
        (
          node_filesystem_avail_bytes{job="node-exporter",fstype!=""} / node_filesystem_size_bytes{job="node-exporter",fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_space.critical.available }}{% raw %}
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: critical
    - alert: NodeFilesystemFilesFillingUp
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available inodes left and is filling
          up.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemfilesfillingup
        summary: Filesystem is predicted to run out of inodes within the next {% endraw %}{{ rules.node_exporter.node_filesystem_files_filling_up.warning.hours }}{% raw %} hours.
      expr: |-
        (
          node_filesystem_files_free{job="node-exporter",fstype!=""} / node_filesystem_files{job="node-exporter",fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_files_filling_up.warning.threshold }}{% raw %}
        and
          predict_linear(node_filesystem_files_free{job="node-exporter",fstype!=""}[6h], {% endraw %}{{ rules.node_exporter.node_filesystem_files_filling_up.warning.hours }}{% raw %}*60*60) < 0
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: warning
    - alert: NodeFilesystemFilesFillingUp
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available inodes left and is filling
          up fast.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemfilesfillingup
        summary: Filesystem is predicted to run out of inodes within the next {% endraw %}{{ rules.node_exporter.node_filesystem_files_filling_up.critical.hours }}{% raw %} hours.
      expr: |-
        (
          node_filesystem_files_free{job="node-exporter",fstype!=""} / node_filesystem_files{job="node-exporter",fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_files_filling_up.critical.threshold }}{% raw %}
        and
          predict_linear(node_filesystem_files_free{job="node-exporter",fstype!=""}[6h], {% endraw %}{{ rules.node_exporter.node_filesystem_files_filling_up.critical.hours }}{% raw %}*60*60) < 0
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: critical
    - alert: NodeFilesystemAlmostOutOfFiles
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available inodes left.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutoffiles
        summary: Filesystem has less than {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_files.warning.available }}{% raw %}% inodes left.
      expr: |-
        (
          node_filesystem_files_free{job="node-exporter",fstype!=""} / node_filesystem_files{job="node-exporter",fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_files.warning.available }}{% raw %}
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: warning
    - alert: NodeFilesystemAlmostOutOfFiles
      annotations:
        description: Filesystem on {{ $labels.device }} at {{ $labels.instance }}
          has only {{ printf "%.2f" $value }}% available inodes left.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutoffiles
        summary: Filesystem has less than {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_files.critical.available }}{% raw %}% inodes left.
      expr: |-
        (
          node_filesystem_files_free{job="node-exporter",fstype!=""} / node_filesystem_files{job="node-exporter",fstype!=""} * 100 < {% endraw %}{{ rules.node_exporter.node_filesystem_almost_out_of_files.critical.available }}{% raw %}
        and
          node_filesystem_readonly{job="node-exporter",fstype!=""} == 0
        )
      for: 1h
      labels:
        severity: critical
    - alert: NodeNetworkReceiveErrs
      annotations:
        description: '{{ $labels.instance }} interface {{ $labels.device }} has encountered
          {{ printf "%.0f" $value }} receive errors in the last two minutes.'
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodenetworkreceiveerrs
        summary: Network interface is reporting many receive errors.
      expr: increase(node_network_receive_errs_total[2m]) > {% endraw %}{{ rules.node_exporter.node_network_receive_errors.warning.errors }}{% raw %}
      for: 1h
      labels:
        severity: warning
    - alert: NodeNetworkTransmitErrs
      annotations:
        description: '{{ $labels.instance }} interface {{ $labels.device }} has encountered
          {{ printf "%.0f" $value }} transmit errors in the last two minutes.'
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodenetworktransmiterrs
        summary: Network interface is reporting many transmit errors.
      expr: increase(node_network_transmit_errs_total[2m]) > {% endraw %}{{ rules.node_exporter.node_network_transmit_errors.warning.errors }}{% raw %}
      for: 1h
      labels:
        severity: warning
{%- endraw %}
