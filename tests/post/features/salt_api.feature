@post @ci @local @salt
Feature: SaltAPI
    Scenario: Login to SaltAPI using Basic auth
        Given the Kubernetes API is available
        When we login to SaltAPI as 'admin' using password 'admin'
        Then authentication fails

    Scenario: Login to SaltAPI using an admin ServiceAccount
        Given the Kubernetes API is available
        When we login to SaltAPI with an admin ServiceAccount
        Then authentication succeeds
        And we can ping all minions
        And we can invoke '[".*"]' on '*'
        And we have '@wheel' perms
        And we have '@runner' perms
        And we have '@jobs' perms

    Scenario: Login to SaltAPI using the storage-operator ServiceAccount
        Given the Kubernetes API is available
        When we login to SaltAPI with the ServiceAccount 'kube-system/storage-operator-controller-manager'
        Then authentication succeeds
        Then we can invoke '["metalk8s_volumes.device_info", "metalk8s_volumes.device_name", {"state.sls": {"kwargs": {"mods": r"metalk8s\.volumes.*"}}}]' on '*'
        And we have '@jobs' perms
        And we can not ping all minions
        And we can not run state 'test.nop' on '*'

    Scenario: Login to SaltAPI using any ServiceAccount
        Given the Kubernetes API is available
        When we login to SaltAPI with the ServiceAccount 'kube-system/default'
        Then authentication succeeds
        And we have no permissions

    Scenario: SaltAPI impersonation using a ServiceAccount
        Given the Kubernetes API is available
        When we impersonate user 'system:serviceaccount:kube-system:storage-operator-controller-manager' against SaltAPI using the ServiceAccount 'kube-system/default'
        Then authentication fails

