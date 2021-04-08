workspace "MetalK8s Alert History" "This is a model of the alert history system." {
    model {
        user = person "User" "A MetalK8s user."
        group "MetalK8s Cluster" {
            logging = softwareSystem "MetalK8s Logging" {
                fluentbit = container "Fluent Bit" "Service collecting and enriching logs."
                loki = container "Loki" "Service indexing and storing logs."
            }
            monitoring = softwareSystem "MetalK8s Monitoring" {
                logger = container "Alert Logger" "Service logging alerts received from Alertmanager."
                alertmanager = container "Alertmanager" "Service deduplicating, grouping and forwarding alerts."
                prometheus = container "Prometheus" "Service monitoring the cluster components."
                grafana = container "Grafana" "Service displaying metrics and logs through dashboards."
            }
        }

        prometheus -> alertmanager "Sends alerts to"
        alertmanager -> logger "Forwards alerts to"
        fluentbit -> logger "Reads logs from"
        fluentbit -> loki "Forwards logs to"
        user -> grafana "Consults alerts dashboard"
        grafana -> prometheus "Queries metrics from"
        grafana -> loki "Queries logs (alerts) from"
    }

    views {
        systemContext monitoring "SystemContext" "An overview of the alert history system." {
            title "Alert history - System Context"
            include *
            autoLayout
        }

        container monitoring "Container" "A detailed view of the alert history system." {
            title "Alert history - Containers"
            include *
        }

    }
}