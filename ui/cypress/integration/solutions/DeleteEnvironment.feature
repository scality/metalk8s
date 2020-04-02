Feature: DeleteEnvironment
   Scenario: Delete a Environment
     Given I log in
     When I go to the solutions list by clicking the solution icon in the sidebar
     And I go to the Create Environment page by clicking the Create a New Environment button
     And I fill out the Create Environment form and check if the environment I created is displayed on the Environments list
     Then I click on the delete button and check if the environment is deleted from the Environments list

