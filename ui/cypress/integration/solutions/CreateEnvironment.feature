Feature: CreateEnvironment 
   Scenario: Create a New Environment
     Given I log in
     When I go to the solutions list by clicking the solution icon in the sidebar
     And I go to the Create Environment page by clicking the Create a New Environment button
     Then I fill out the Create Environment form and check if the environment I created is displayed on the Environments list
