@post @ci @local @salt
Feature: SaltAPI
    Scenario: Login to SaltAPI using Basic auth
        Given the Kubernetes API is available
        When we login to SaltAPI as 'admin' using password 'admin'
        Then we can ping all minions
        And we can invoke '[".*"]' on '*'
        And we have '@wheel' perms
        And we have '@runner' perms
        And we have '@jobs' perms

    Scenario: Login to SaltAPI using a ServiceAccount
        Given the Kubernetes API is available
        When we login to SaltAPI with the ServiceAccount 'storage-operator'
        Then we can invoke '["disk.dump", "state.sls"]' on '*'
        And we have '@jobs' perms

    Scenario: Login to SaltAPI using an incorrect password
        Given the Kubernetes API is available
        When we login to SaltAPI as 'admin' using password 'notadmin'
        Then authentication fails

    Scenario: Login to SaltAPI using an incorrect username
        Given the Kubernetes API is available
        When we login to SaltAPI as 'notadmin' using password 'admin'
        Then authentication fails
