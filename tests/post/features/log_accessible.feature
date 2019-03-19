@ci @local @post
Feature: logs should be accessible
    Scenario: get logs
        Given the Kubernetes API is available
        Then the pods logs should not be empty
