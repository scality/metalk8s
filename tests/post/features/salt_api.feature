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

    Scenario: Login to SaltAPI using the storage-operator ServiceAccount
        Given the Kubernetes API is available
        When we login to SaltAPI with the ServiceAccount 'kube-system/storage-operator'
        Then we can invoke '["disk.dump", {"state.sls": {"kwargs": {"mods": r"metalk8s\.volumes.*"}}}]' on '*'
        And we have '@jobs' perms
        And we can not ping all minions
        And we can not run state 'test.nop' on '*'

    Scenario: Login to SaltAPI using any ServiceAccount
        Given the Kubernetes API is available
        When we login to SaltAPI with the ServiceAccount 'kube-system/default'
        Then we have no permissions

    Scenario: SaltAPI impersonation using a ServiceAccount
        Given the Kubernetes API is available
        When we impersonate user 'system:serviceaccount:kube-system:storage-operator' against SaltAPI using the ServiceAccount 'kube-system/default'
        Then authentication fails

    Scenario: Login to SaltAPI using an incorrect password
        Given the Kubernetes API is available
        When we login to SaltAPI as 'admin' using password 'notadmin'
        Then authentication fails

    Scenario: Login to SaltAPI using an incorrect username
        Given the Kubernetes API is available
        When we login to SaltAPI as 'notadmin' using password 'admin'
        Then authentication fails
