@post @ci @local
Feature: Pods should be alive
    Scenario: get pods
        Given The kubernetes api is available
        Then the 'pods' list should not be empty in the 'kube-system' namespace
