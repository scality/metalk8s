
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
              name: test-volume1
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s-prometheus
              sparseLoopDevice:
                size: 10Gi
              template:
                metadata:
                  labels:
                    random-key: random-value
        Then the Volume 'test-volume1' is 'Available'
        And the PersistentVolume 'test-volume1' has size '10Gi'
        And the PersistentVolume 'test-volume1' has label 'random-key' with value 'random-value'
        And the backing storage for Volume 'test-volume1' is created

    Scenario: Test volume deletion (sparseLoopDevice)
        Given a Volume 'test-volume2' exist
        When I delete the Volume 'test-volume2'
        Then the Volume 'test-volume2' does not exist
        And the PersistentVolume 'test-volume2' does not exist
        And the backing storage for Volume 'test-volume2' is deleted

    Scenario: Test PersistentVolume protection
        Given a Volume 'test-volume3' exist
        When I delete the PersistentVolume 'test-volume3'
        Then the PersistentVolume 'test-volume3' is marked for deletion
        And the Volume 'test-volume3' is 'Available'
        When I delete the Volume 'test-volume3'
        Then the Volume 'test-volume3' does not exist
        And the PersistentVolume 'test-volume3' does not exist

    Scenario: Create a volume with no volume type
        Given the Kubernetes API is available
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume4
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s-prometheus
        Then the Volume 'test-volume4' is 'Failed' with code 'InternalError' and message matches 'volume type not found'

    Scenario: Create a volume with an invalid volume type
        Given the Kubernetes API is available
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume5
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s-prometheus
              someRandomDevice:
                capacity: 10Gi
        Then the Volume 'test-volume5' is 'Failed' with code 'InternalError' and message matches 'volume type not found'

    Scenario: Test in-use protection
        Given a Volume 'test-volume6' exist
        And a PersistentVolumeClaim exists for 'test-volume6'
        And a Pod using volume 'test-volume6' and running '["sleep", "60"]' exist
        When I delete the Volume 'test-volume6'
        Then the Volume 'test-volume6' is 'Available'
        And the Volume 'test-volume6' is marked for deletion
        And the PersistentVolume 'test-volume6' is marked for deletion
        When I delete the Pod using 'test-volume6'
        And I delete the PersistentVolumeClaim on 'test-volume6'
        Then the Volume 'test-volume6' does not exist
        And the PersistentVolume 'test-volume6' does not exist

    Scenario: Volume usage (data persistency)
        Given a Volume 'test-volume7' exist
        And a PersistentVolumeClaim exists for 'test-volume7'
        And a Pod using volume 'test-volume7' and running '["sh", "-c", "echo 'foo' > /mnt/bar.txt"]' exist
        When I delete the Pod using 'test-volume7'
        And I create a Pod using volume 'test-volume7' and running '["sleep", "60"]'
        Then the Pod using volume 'test-volume7' has a file '/mnt/bar.txt' containing 'foo'

    Scenario: Create a volume with unsupported FS type
        When I create the following StorageClass:
          apiVersion: storage.k8s.io/v1
          kind: StorageClass
          metadata:
            name: test-sc-btrfs
          provisioner: kubernetes.io/no-provisioner
          parameters:
            fsType: btrfs
            mkfsOptions: '["-d", "raid0"]'
          reclaimPolicy: Retain
          mountOptions: []
          volumeBindingMode: WaitForFirstConsumer
        And I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume8
            spec:
              nodeName: bootstrap
              storageClassName: test-sc-btrfs
              sparseLoopDevice:
                size: 10Gi
        Then the Volume 'test-volume8' is 'Failed' with code 'CreationError' and message matches 'unsupported filesystem: btrfs'

    Scenario: Create a volume using a non-existing StorageClass
        Given the StorageClass 'not-found' does not exist
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume9
            spec:
              nodeName: bootstrap
              storageClassName: not-found
              sparseLoopDevice:
                size: 10Gi
        Then the Volume 'test-volume9' is 'Failed' with code 'CreationError' and message matches 'not found in pillar'

    Scenario: Delete a Volume with missing StorageClass
        Given a StorageClass 'test-sc-delete' exist
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume10
            spec:
              nodeName: bootstrap
              storageClassName: test-sc-delete
              sparseLoopDevice:
                size: 10Gi
        And I delete the StorageClass 'test-sc-delete'
        And I delete the Volume 'test-volume10'
        Then the Volume 'test-volume10' does not exist
        And the PersistentVolume 'test-volume10' does not exist
