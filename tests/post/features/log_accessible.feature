@ci @local @post
Feature: logs should be accessible
    Scenario: get logs
        Given The kubernetes api is available
        Then The pods logs should not be empty
