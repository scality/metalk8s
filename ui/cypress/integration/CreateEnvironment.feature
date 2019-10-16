@skip
Feature: Solutions
   Scenario: Environment Provision
     Given I log in
     When I go to the solutions list by click the solution icon in the sidebar
     And I go to the Create Envrionments page by clicking the Create a New Environment button
     Then I fill out the Create Envrionments form and ckeck if the environment I created is displayed on the envrionments list
     When I click on the Add Solution button to add a solution to the environment
     And I fill out the Add Solution form in the modal and I check if the solution is added the environment


