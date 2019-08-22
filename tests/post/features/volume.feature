
@post @local @ci @volume
Feature: Volume management
    Scenario: Our StorageClass is deployed
        Given the Kubernetes API is available
        Then we have a StorageClass 'metalk8s-prometheus'

    Scenario: The storage operator is up
        Given the Kubernetes API is available
        Then we have 1 running pod labeled 'name=storage-operator' in namespace 'kube-system'

    Scenario: Test volume creation (sparseLoopDevice)
        Given the Kubernetes API is available
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: volume1
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s-prometheus
              sparseLoopDevice:
                size: 10Gi
        Then the Volume 'volume1' is 'Available'
        And the PersistentVolume 'volume1' has size '10Gi'

    Scenario: Test volume deletion (sparseLoopDevice)
        Given a Volume 'volume2' exist
        When I delete the Volume 'volume2'
        Then the Volume 'volume2' does not exist
        And the PersistentVolume 'volume2' does not exist
