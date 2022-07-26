@post @ci @local @operator
Feature: Operator
    Scenario: Creation of extra ClusterConfig
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=metalk8s-operator' are 'Ready'
        When we create an extra 'test-cc' ClusterConfig
        Then the 'test-cc' ClusterConfig get deleted

    Scenario: Deletion of the main ClusterConfig
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=metalk8s-operator' are 'Ready'
        When we delete the 'main' ClusterConfig
        Then the 'main' ClusterConfig get automatically recreated
