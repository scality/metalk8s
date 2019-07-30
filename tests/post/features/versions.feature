@post @ci @local
Feature: Check versions in the running cluster
    Scenario: Check the cluster's Kubernetes version
        Given the Kubernetes API is available
        Then the Kubernetes version deployed is the same as the configured one
