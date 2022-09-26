
@post @local @ci @volume
Feature: Volume management
    Scenario: Our StorageClass is deployed
        Given the Kubernetes API is available
        Then we have a StorageClass 'metalk8s'

    Scenario: The storage operator is up
        Given the Kubernetes API is available
        Then we have 1 running pod labeled 'name=storage-operator' in namespace 'kube-system'

    Scenario: Test volume creation (sparseLoopDevice)
        Given the Kubernetes API is available
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume1-sparse
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              sparseLoopDevice:
                size: 10Gi
              template:
                metadata:
                  labels:
                    random-key: random-value
        Then the Volume 'test-volume1-sparse' is 'Available'
        And the PersistentVolume 'test-volume1-sparse' has size '10Gi'
        And the PersistentVolume 'test-volume1-sparse' has label 'random-key' with value 'random-value'
        And the Volume 'test-volume1-sparse' has device name 'loop\d+'
        And the backing storage for Volume 'test-volume1-sparse' is created
        When I delete the Volume 'test-volume1-sparse'
        Then the Volume 'test-volume1-sparse' does not exist
        And the PersistentVolume 'test-volume1-sparse' does not exist
        And the backing storage for Volume 'test-volume1-sparse' is deleted

    Scenario: Test volume creation (rawBlockDevice)
        Given the Kubernetes API is available
        And a device exists
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume1-rawblock
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              rawBlockDevice:
                devicePath: {device_path}
              template:
                metadata:
                  labels:
                    random-key: random-value
        Then the Volume 'test-volume1-rawblock' is 'Available'
        And the PersistentVolume 'test-volume1-rawblock' has size '{device_size}'
        And the PersistentVolume 'test-volume1-rawblock' has label 'random-key' with value 'random-value'
        And the Volume 'test-volume1-rawblock' has device name '{device_name}'
        When I delete the Volume 'test-volume1-rawblock'
        Then the Volume 'test-volume1-rawblock' does not exist
        And the backing storage for Volume 'test-volume1-rawblock' still exists

    Scenario: Test volume creation (lvmLogicalVolume)
        Given the Kubernetes API is available
        And a LVM VG 'test-vg-1' exists
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume1-lvmlv
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              lvmLogicalVolume:
                vgName: test-vg-1
                size: 10Gi
              template:
                metadata:
                  labels:
                    random-key: random-value
        Then the Volume 'test-volume1-lvmlv' is 'Available'
        And the PersistentVolume 'test-volume1-lvmlv' has size '10Gi'
        And the PersistentVolume 'test-volume1-lvmlv' has label 'random-key' with value 'random-value'
        And the device '/dev/test-vg-1/test-volume1-lvmlv' exists
        And the Volume 'test-volume1-lvmlv' has device name 'dm-\d+'
        When I delete the Volume 'test-volume1-lvmlv'
        Then the Volume 'test-volume1-lvmlv' does not exist
        And the device '/dev/test-vg-1/test-volume1-lvmlv' exists
        And the backing storage for Volume 'test-volume1-lvmlv' still exists

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
              storageClassName: metalk8s
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
              storageClassName: metalk8s
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

    Scenario: Test deletion while creation is in progress
        Given the Kubernetes API is available
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume11
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              sparseLoopDevice:
                size: 10Gi
        Then the Volume 'test-volume11' is 'Pending'
        When I delete the Volume 'test-volume11'
        Then the Volume 'test-volume11' does not exist
        And the PersistentVolume 'test-volume11' does not exist

    Scenario: Test volume creation (sparseLoopDevice Block mode)
        Given the Kubernetes API is available
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume12-loop
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              mode: Block
              sparseLoopDevice:
                size: 10Gi
        Then the Volume 'test-volume12-loop' is 'Available'
        And the PersistentVolume 'test-volume12-loop' has size '10Gi'
        And the backing storage for Volume 'test-volume12-loop' is created

    Scenario: Test volume creation (rawBlockDevice Block mode)
        Given the Kubernetes API is available
        And a device exists
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume12-rawblock
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              mode: Block
              rawBlockDevice:
                devicePath: {device_path}
        Then the Volume 'test-volume12-rawblock' is 'Available'
        And the PersistentVolume 'test-volume12-rawblock' has size '{device_size}'

    Scenario: Test volume creation (lvmLogicalVolume Block mode)
        Given the Kubernetes API is available
        And a LVM VG 'test-vg-12' exists
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-volume12-lvmlv
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              mode: Block
              lvmLogicalVolume:
                vgName: test-vg-12
                size: 10Gi
        Then the Volume 'test-volume12-lvmlv' is 'Available'
        And the PersistentVolume 'test-volume12-lvmlv' has size '10Gi'
        And the device '/dev/test-vg-12/test-volume12-lvmlv' exists

    Scenario: Test volume re-creation (lvmLogicalVolume force-lvcreate)
        # Skip test on CentOS/RHEL 7, because lvm still creates when signatures are found
        Given the grain 'osmajorrelease' is not 7
        And the Kubernetes API is available
        And a LVM VG 'test-vg-13' exists
        And a LVM LV 'test-lv-13' in VG 'test-vg-13' was created, formatted, then removed
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-lv-13
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              lvmLogicalVolume:
                vgName: test-vg-13
                size: 1Gi
        Then the Volume 'test-lv-13' is 'Failed' with code 'CreationError' and message matches 'signature detected on /dev/test-vg-13/test-lv-13'
        When I delete the Volume 'test-lv-13'
        Then the Volume 'test-lv-13' does not exist
        When I create the following Volume:
            apiVersion: storage.metalk8s.scality.com/v1alpha1
            kind: Volume
            metadata:
              name: test-lv-13
              annotations:
                metalk8s.scality.com/force-lvcreate: ""
            spec:
              nodeName: bootstrap
              storageClassName: metalk8s
              lvmLogicalVolume:
                vgName: test-vg-13
                size: 1Gi
        Then the Volume 'test-lv-13' is 'Available'
