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
                Parsers_File   custom_parsers.conf
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
                Add            unit unknown
            # Lift kubernetes labels as we have no "easy way" to get a specific
            # nested field (especially if this one is not always available)
            # Sees: https://github.com/fluent/fluent-bit/issues/2152
            [FILTER]
                Name           nest
                Match          kube.*
                Operation      lift
                Nested_under   kubernetes
                Add_prefix     kubernetes_
            [FILTER]
                Name           nest
                Match          kube.*
                Operation      lift
                Nested_under   kubernetes_labels
                Add_prefix     kubernetes_labels_
            [FILTER]
                Name           modify
                Match          kube.*
                Remove         logtag
                # Rename just skipped if dest key already exists
                Rename         kubernetes_labels_app.kubernetes.io/name app
                Rename         kubernetes_labels_app app
                Rename         kubernetes_labels_release release
                Rename         kubernetes_container_name container
                Rename         kubernetes_host node
                Rename         kubernetes_namespace_name namespace
                Rename         kubernetes_pod_name pod
                Remove_wildcard kubernetes_
                # Add unknown for all fields as fluent-bit loki
                # output complain if "Label_Keys" does not exists
                Add            app unknown
                Add            release unknown
                Add            container unknown
                Add            node unknown
                Add            namespace unknown
                Add            pod unknown
                Add            stream unknown
            [Output]
                Name           loki
                Match          kube.*
                Host           loki
                Port           3100
                Tenant_ID      ""
                Labels         job=fluent-bit
                Label_Keys     $container, $node, $namespace, $pod, $app, $release, $stream
                Auto_Kubernetes_Labels false
                Line_Format    json
                Log_Level      warn
            [Output]
                Name           loki
                Match          host.*
                Host           loki
                Port           3100
                Tenant_ID      ""
                Labels         job=fluent-bit
                Label_Keys     $hostname, $unit
                Line_Format    json
                Log_Level      warn
          custom_parsers.conf: |-
            [PARSER]
                Name        container
                Format      regex
                Regex       ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]+) (?<message>.+)$
                Time_Key    time
                Time_Format %Y-%m-%dT%H:%M:%S.%L%z
                Time_Keep   Off
