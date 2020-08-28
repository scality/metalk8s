Feature: Create and delete volume scenario
  Scenario: I can create a SparseLoopDevice volume
    Given I am logged in
    And I am on the volume creation page
    When I fill out the volume creation form using:
        | name       | test-volume-sparse  |
        | type       | sparseLoopDevice    |
        | size       | 1 GiB               |
        | labelName  | kubernetest.io/name |
        | labelValue | test                |
    And I click [Create] button
    Then I am redirected to the "test-volume-sparse" volume page
    And the volume "test-volume-sparse" becomes Ready
    And the label of volume "test-volume-sparse" presents:
        | labelName  | kubernetest.io/name |
        | labelValue | test                |
