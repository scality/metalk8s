@ci @local @post
Feature: logs should be accessible
    Scenario: check logs from all containers
        Given the Kubernetes API is available
        Then all Pod logs should be non-empty
