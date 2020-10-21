Feature: Solutions

  I can manage Solutions and Environments from the Solutions page.

  @solutions
  Scenario: Add a Solution to Environment
    Given I am logged in
    When I go to the solutions list by clicking the solution icon in the sidebar
    And I go to the Create Environment page by clicking the Create a New Environment button
    And I fill out the Create Environment form and check if the environment I created is displayed on the Environments list
    When I click on the Add Solution button to add a solution to the environment
    Then I fill out the Add Solution form in the modal and I check if the solution is added the environment

  @solutions
  Scenario: Create a New Environment
    Given I am logged in
    When I go to the solutions list by clicking the solution icon in the sidebar
    And I go to the Create Environment page by clicking the Create a New Environment button
    Then I fill out the Create Environment form and check if the environment I created is displayed on the Environments list

  @solutions
  Scenario: Delete a Environment
    Given I am logged in
    When I go to the solutions list by clicking the solution icon in the sidebar
    And I go to the Create Environment page by clicking the Create a New Environment button
    And I fill out the Create Environment form and check if the environment I created is displayed on the Environments list
    Then I click on the delete button and check if the environment is deleted from the Environments list

  @solutions
  Scenario: Upgrade a Solution
    Given I am logged in
    When I go to the solutions list by clicking the solution icon in the sidebar
    And I go to the Create Environment page by clicking the Create a New Environment button
    And I fill out the Create Environment form and check if the environment I created is displayed on the Environments list
    When I click on the Add Solution button to add a solution to the environment
    And I fill out the Add Solution form in the modal and I check if the solution is added the environment
    When I go to the Environment Detail page by clicking the environment list
    Then I click on upgrade button and check the solution is upgraded

  @solutions
  Scenario: Downgrade a Solution
    Given I am logged in
    When I go to the solutions list by clicking the solution icon in the sidebar
    And I go to the Create Environment page by clicking the Create a New Environment button
    And I fill out the Create Environment form and check if the environment I created is displayed on the Environments list
    When I click on the Add Solution button to add a solution to the environment
    And I fill out the Add Solution form in the modal and I check if the solution is added the environment
    When I go to the Environment Detail page by clicking the environment list
    And I click on upgrade button and check the solution is upgraded
    Then I click on the downgrade button and check the solution is downgraded
