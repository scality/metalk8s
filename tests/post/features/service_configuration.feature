@post @local @ci @csc
Feature: Cluster and Services Configurations
    Scenario: Propagation of Service Configurations to underlying Services
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=dex' are 'Ready'
        And we have 2 running pod labeled 'app.kubernetes.io/name=dex' in namespace 'metalk8s-auth'
        And we have a 'metalk8s-dex-config' CSC in namespace 'metalk8s-auth' with 'spec.deployment.replicas' equal to '2'
        When we update 'metalk8s-dex-config' CSC in namespace 'metalk8s-auth' 'spec.deployment.replicas' to '3'
        And we apply the 'metalk8s.addons.dex.deployed' salt state
        Then we have '3' at 'status.available_replicas' for 'dex' Deployment in namespace 'metalk8s-auth'
