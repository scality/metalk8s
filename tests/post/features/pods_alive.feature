@post @ci @local
Feature: Pods should be alive
    Scenario: List Pods
        Given the Kubernetes API is available
        Then the 'pods' list should not be empty in the 'kube-system' namespace

    Scenario: Exec in Pods
        Given the Kubernetes API is available
        Then we can exec 'true' in the 'salt-master-bootstrap' pod in the 'kube-system' namespace
