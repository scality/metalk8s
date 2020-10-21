Feature: Language management
  Scenario: I can switch the selected language
    Given I am logged in
    Then I change the language by click the dropdown in the navbar
    Then I log out
