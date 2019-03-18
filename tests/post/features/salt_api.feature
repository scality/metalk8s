@popst @ci @local @salt
Feature: SaltAPI
    Scenario: Login to SaltAPI
        Given the Kubernetes API is available
        When we login to SaltAPI as 'admin' using password 'admin'
        Then we can ping all minions
