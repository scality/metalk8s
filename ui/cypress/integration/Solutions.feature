Feature: Solutions 
   Scenario: Environment List
     Given I log in
     When I go to the solutions list by clicking the solution icon in the sidebar
     And I go to the Create Environment page by clicking the Create a New Environment button
     Then I fill out the Create Environment form and check if the environment I created is displayed on the Environments list
     When I click on the Add Solution button to add a solution to the environment
     And I fill out the Add Solution form in the modal and I check if the solution is added the environment
     Then I click on the delete button and check if the environment is deleted from the Environments list

