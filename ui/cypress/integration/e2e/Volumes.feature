Feature: Volumes

  I can manage volumes from the Volume page.

  Scenario: I can create a SparseLoopDevice volume
    Given I am logged in
    And I am on the volume creation page
    When I fill out the volume creation form using:
        | name       | test-volume-sparse  |
        | type       | sparseLoopDevice    |
        | size       | 1 GiB               |
        | labelName  | kubernetes.io/name  |
        | labelValue | test                |
    And I click [Create] button
    Then I am redirected to the "test-volume-sparse" volume page
    And the volume "test-volume-sparse" becomes Ready
    And the labels the volume include:
        | labelName  | kubernetes.io/name  |
        | labelValue | test                |
    When I click [Delete] button
    And I confirm the deletion
    Then the "test-volume-sparse" volume is removed from the list
