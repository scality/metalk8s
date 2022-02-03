@post @ci @local @registry
Feature: Registry is up and running
  Scenario: Pull container image from registry
    Given the Kubernetes API is available
    And pods with label 'app.kubernetes.io/name=repositories' are 'Ready'
    When we pull metalk8s utils image from node 'bootstrap'
    Then pull succeeds

  Scenario: We can reach registry from a container
    Given the Kubernetes API is available
    And pods with label 'app.kubernetes.io/name=repositories' are 'Ready'
    Then we can reach registry from inside a container

  @registry_ha
  Scenario: Pull container image from registry (HA)
    Given the Kubernetes API is available
    And we are on a multi node cluster
    And we have 1 running pod labeled 'app.kubernetes.io/name=repositories' in namespace 'kube-system'
    When we set up repositories on 'node-1'
    Then we have 1 running pod labeled 'app.kubernetes.io/name=repositories' in namespace 'kube-system' on node 'node-1'
    When we pull metalk8s utils image from node 'bootstrap'
    Then pull succeeds
    When we stop repositories on node 'bootstrap'
    And we pull metalk8s utils image from node 'bootstrap'
    Then pull succeeds
    When we stop repositories on node 'node-1'
    And we pull metalk8s utils image from node 'bootstrap'
    Then pull fails
