@post @ci @local @logging
Feature: Logging stack is up and running
  Scenario: List Pods
    Given the Kubernetes API is available
    Then the 'pods' list should not be empty in the 'metalk8s-logging' namespace

  Scenario: Expected Pods
    Given the Kubernetes API is available
    Then we have 1 running pod labeled 'app=loki' in namespace 'metalk8s-logging'

  Scenario: Pushing log to Loki directly
    Given the Kubernetes API is available
    And the Loki API is available
    When we push an example log to Loki
    Then we can query this example log from Loki
