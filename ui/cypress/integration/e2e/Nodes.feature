Feature: Nodes
  Scenario: I can access the nodes list
    Given I am logged in
    When I am on the node page
    Then the bootstrap node appears the node list
