
@post @local @ci @volume
Feature: Volume management
    Scenario: Our StorageClass is deployed
        Given the Kubernetes API is available
        Then we have a StorageClass 'metalk8s-prometheus'

    Scenario: The storage operator is up
        Given the Kubernetes API is available
        Then we have 1 running pod labeled 'name=storage-operator' in namespace 'kube-system'
