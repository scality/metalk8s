@post @local @ci @csc
Feature: Cluster and Services Configurations
    Scenario: Propagation of Service Configurations to underlying Services
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=dex' are 'Ready'
        And we have 2 running pod labeled 'app.kubernetes.io/name=dex' in namespace 'metalk8s-auth'
        And we have a 'metalk8s-dex-config' CSC in namespace 'metalk8s-auth'
        When we update 'metalk8s-dex-config' CSC in namespace 'metalk8s-auth' 'spec.deployment.replicas' to '3'
        And we apply the 'metalk8s.addons.dex.deployed' salt state
        Then we have '3' at 'status.available_replicas' for 'dex' Deployment in namespace 'metalk8s-auth'
        And we restore original state of 'metalk8s-dex-config' CSC in namespace 'metalk8s-auth'

    Scenario: Customization of pre-defined Prometheus rules
        Given the Kubernetes API is available
        And pods with label 'app=prometheus' are 'Ready'
        And we have a 'metalk8s-prometheus-config' CSC in namespace 'metalk8s-monitoring'
        When we update 'metalk8s-prometheus-config' CSC in namespace 'metalk8s-monitoring' 'spec.rules.node_exporter.node_filesystem_space_filling_up.warning.hours' to '48'
        And we apply the 'metalk8s.addons.prometheus-operator.deployed.prometheus-rules' salt state
        Then we have an alert rule 'NodeFilesystemSpaceFillingUp' in group 'node-exporter' with severity 'warning' and 'annotations.summary' equal to 'Filesystem is predicted to run out of space within the next 48 hours.'
        And we restore original state of 'metalk8s-prometheus-config' CSC in namespace 'metalk8s-monitoring'
