include:
  - ...deployed.namespace

Create fluent-bit ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: fluent-bit
          namespace: metalk8s-logging
          labels:
            app: fluent-bit
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/name: fluent-bit
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
            release: fluent-bit
        data:
          fluent-bit.conf: |-
            [SERVICE]
                HTTP_Server    On
                HTTP_Listen    0.0.0.0
                HTTP_PORT      2020
                Flush          1
                Daemon         Off
                Log_Level      warn
                Parsers_File   parsers.conf
            [INPUT]
                Name           tail
                Tag            kube.*
                Path           /var/log/containers/*.log
                Parser         container
                DB             /run/fluent-bit/flb_kube.db
                Mem_Buf_Limit  5MB
            [INPUT]
                Name           systemd
                Tag            host.*
                DB             /run/fluent-bit/flb_journal.db
                Mem_Buf_Limit  5MB
                Strip_Underscores On
            [FILTER]
                Name           kubernetes
                Match          kube.*
                Kube_URL       https://kubernetes.default.svc:443
                Merge_Log On
                K8S-Logging.Parser Off
            [FILTER]
                Name           modify
                Match          host.*
                Rename         HOSTNAME hostname
                Rename         SYSTEMD_UNIT unit
                Rename         MESSAGE message
                Remove         CAP_EFFECTIVE
                Remove         SYSTEMD_SLICE
                Remove         PID
                Remove         STREAM_ID
                Remove         PRIORITY
                Remove         COMM
                Remove         CMDLINE
                Remove         EXE
                Remove         SYSTEMD_CGROUP
                Remove         SELINUX_CONTEXT
                Remove         MACHINE_ID
                Remove         SYSLOG_IDENTIFIER
                Remove         TRANSPORT
                Remove         SYSLOG_FACILITY
                Remove         BOOT_ID
                Remove         UID
                Remove         GID
            [FILTER]
                Name           modify
                Match          kube.*
                Remove         logtag
            [Output]
                Name           grafana-loki
                Match          *
                Url            http://loki:3100/loki/api/v1/push
                TenantID       ""
                BatchWait      1
                BatchSize      10240
                Labels         {job="fluent-bit"}
                RemoveKeys     kubernetes,stream,hostname,unit
                AutoKubernetesLabels false
                LabelMapPath   /fluent-bit/etc/labelmap.json
                LineFormat     json
                LogLevel       warn
          labelmap.json: |-
            {
              "kubernetes": {
                "container_name": "container",
                "host": "node",
                "labels": {
                  "app": "app",
                  "release": "release"
                },
                "namespace_name": "namespace",
                "pod_name": "pod"
              },
              "stream": "stream",
              "hostname": "hostname",
              "unit": "unit"
            }
          parsers.conf: |-
            [PARSER]
                Name        container
                Format      regex
                Regex       ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]+) (?<message>.+)$
                Time_Key    time
                Time_Format %Y-%m-%dT%H:%M:%S.%L%z
                Time_Keep   Off
