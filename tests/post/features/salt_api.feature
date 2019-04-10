@popst @ci @local @salt
Feature: SaltAPI
    Scenario: Login to SaltAPI
        Given the Kubernetes API is available
        When we login to SaltAPI as 'admin' using password 'admin'
        Then we can ping all minions

    Scenario: Login to SaltAPI using an incorrect password
        Given the Kubernetes API is available
        When we login to SaltAPI as 'admin' using password 'notadmin'
        Then authentication fails

    Scenario: Login to SaltAPI using an incorrect username
        Given the Kubernetes API is available
        When we login to SaltAPI as 'notadmin' using password 'admin'
        Then authentication fails
