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
    app: prometheus-operator
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: prometheus-operator
    app.kubernetes.io/part-of: metalk8s
    chart: prometheus-operator-8.1.2
    metalk8s.scality.com/monitor: ''
    heritage: metalk8s
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
      expr: increase(node_network_receive_errs_total[2m]) / rate(node_network_receive_packets_total[2m])
        > {% endraw %}{{ rules.node_exporter.node_network_receive_errors.warning.error_rate }}{% raw %}
      for: 1h
      labels:
        severity: warning
    - alert: NodeNetworkTransmitErrs
      annotations:
        description: '{{ $labels.instance }} interface {{ $labels.device }} has encountered
          {{ printf "%.0f" $value }} transmit errors in the last two minutes.'
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodenetworktransmiterrs
        summary: Network interface is reporting many transmit errors.
      expr: increase(node_network_transmit_errs_total[2m]) / rate(node_network_transmit_packets_total[2m])
        > {% endraw %}{{ rules.node_exporter.node_network_transmit_errors.warning.error_rate }}{% raw %}
      for: 1h
      labels:
        severity: warning
    - alert: NodeHighNumberConntrackEntriesUsed
      annotations:
        description: '{{ $value | humanizePercentage }} of conntrack entries are used'
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodehighnumberconntrackentriesused
        summary: Number of conntrack are getting close to the limit
      expr: (node_nf_conntrack_entries / node_nf_conntrack_entries_limit) > {% endraw %}{{ rules.node_exporter.node_high_number_conntrack_entries_used.warning.threshold }}{% raw %}
      labels:
        severity: warning
    - alert: NodeClockSkewDetected
      annotations:
        message: Clock on {{ $labels.instance }} is out of sync by more than 300s.
          Ensure NTP is configured correctly on this host.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeclockskewdetected
        summary: Clock skew detected.
      expr: |-
        (
          node_timex_offset_seconds > {% endraw %}{{ rules.node_exporter.node_clock_skew_detected.warning.threshold.high }}{% raw %}
        and
          deriv(node_timex_offset_seconds[5m]) >= 0
        )
        or
        (
          node_timex_offset_seconds < {% endraw %}{{ rules.node_exporter.node_clock_skew_detected.warning.threshold.low }}{% raw %}
        and
          deriv(node_timex_offset_seconds[5m]) <= 0
        )
      for: 10m
      labels:
        severity: warning
    - alert: NodeClockNotSynchronising
      annotations:
        message: Clock on {{ $labels.instance }} is not synchronising. Ensure NTP
          is configured on this host.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeclocknotsynchronising
        summary: Clock not synchronising.
      expr: |-
        min_over_time(node_timex_sync_status[5m]) == {% endraw %}{{ rules.node_exporter.node_clock_not_synchronising.warning.threshold }}{% raw %}
        and
        node_timex_maxerror_seconds >= 16
      for: 10m
      labels:
        severity: warning
    - alert: NodeTextFileCollectorScrapeError
      annotations:
        description: Node Exporter text file collector failed to scrape.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodetextfilecollectorscrapeerror
        summary: Node Exporter text file collector failed to scrape.
      expr: node_textfile_scrape_error{job="node-exporter"} == 1
      labels:
        severity: warning
    - alert: NodeRAIDDegraded
      annotations:
        description: RAID array '{{ $labels.device }}' on {{ $labels.instance }} is
          in degraded state due to {% endraw %}{{ rules.node_exporter.node_raid_degraded.critical.threshold }}{% raw %} or more disks failures. Number of spare drives
          is insufficient to fix issue automatically.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-noderaiddegraded
        summary: RAID Array is degraded
      expr: node_md_disks_required - ignoring (state) (node_md_disks{state="active"})
        >= {% endraw %}{{ rules.node_exporter.node_raid_degraded.critical.threshold }}{% raw %}
      for: 15m
      labels:
        severity: critical
    - alert: NodeRAIDDiskFailure
      annotations:
        description: At least {% endraw %}{{ rules.node_exporter.node_raid_disk_failure.warning.threshold }}{% raw %} device in RAID array on {{ $labels.instance }} failed.
          Array '{{ $labels.device }}' needs attention and possibly a disk swap.
        runbook_url: https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-noderaiddiskfailure
        summary: Failed device in RAID array
      expr: node_md_disks{state="failed"} >= {% endraw %}{{ rules.node_exporter.node_raid_disk_failure.warning.threshold }}{% raw %}
      labels:
        severity: warning
{%- endraw %}
