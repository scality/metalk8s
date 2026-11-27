@post @ci @local @registry
Feature: Registry is up and running
  Scenario: Pull container image from registry
    Given the Kubernetes API is available
    When we pull metalk8s utils image from node 'node-1'
    Then pull succeeds

  # The repositories Pod still serves the registries of Solutions
  Scenario: We can reach registry from a container
    Given the Kubernetes API is available
    And pods with label 'app.kubernetes.io/name=repositories' are 'Ready'
    Then we can reach registry from inside a container

  Scenario Outline: Repositories do not list directories
    Given the Kubernetes API is available
    And pods with label 'app.kubernetes.io/name=repositories' are 'Ready'
    When we request '<path>' on the repositories
    Then the repositories answer '<status>'

    Examples:
      | path               | status |
      | /                  | 200    |
      | /{saltenv}/        | 200    |
      | /metalk8s-0.0.0/   | 404    |
      | /{saltenv}/redhat/ | 403    |
