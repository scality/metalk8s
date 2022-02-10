@post @ci @local @logging
Feature: Logging stack is up and running
  Scenario: List Pods
    Given the Kubernetes API is available
    Then the 'pods' list should not be empty in the 'metalk8s-logging' namespace

  Scenario: Expected Pods
    Given the Kubernetes API is available
    Then we have 1 running pod labeled 'app=loki' in namespace 'metalk8s-logging'
    And we have 1 running pod labeled 'app.kubernetes.io/name=fluent-bit' in namespace 'metalk8s-logging' on node 'bootstrap'

  Scenario: Pushing log to Loki directly
    Given the Kubernetes API is available
    And the Loki API is available
    When we push an example log to Loki
    Then we can query this example log from Loki

  Scenario: Logging pipeline is working
    Given the Kubernetes API is available
    And the Loki API is available
    And we have set up a logger pod
    Then we can retrieve logs from logger pod in Loki API

  Scenario: Retrieve cluster alerts from Loki
    Given the Kubernetes API is available
    And the Loki API is available
    Then we can retrieve 'Watchdog' alert from Loki API

  Scenario: We can access a specific Loki instance
    Given the Kubernetes API is available
    Then the Loki API is available through Service 'loki-0'
