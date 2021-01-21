StorageClass Creation
=====================

MetalK8s uses **StorageClass** objects to describe how volumes are
formatted and mounted.
This procedure explains how to create a Storageclass using the **CLI**.

#. Create a **StorageClass** manifest.

   You can define a new **StorageClass** using the following template:

   .. code-block:: yaml

       apiVersion: storage.k8s.io/v1
       kind: StorageClass
       metadata:
         name: <storageclass_name>
       provisioner: kubernetes.io/no-provisioner
       reclaimPolicy: Retain
       volumeBindingMode: WaitForFirstConsumer
       mountOptions:
         - rw
       parameters:
         fsType: <filesystem_type>
         mkfsOptions: <mkfs_options>

   Set the following fields:

      - **mountOptions**: specifies how the volume should be mounted. For
        example: **rw** (read/write), or **ro** (read-only).
      - **fsType**: specifies the filesystem to use on the volume.
        **xfs** and **ext4** are the only currently supported file system types.
      - **mkfsOptions**: specifies how the volume should be formatted.
        This field is optional
        (note that the options are passed as a JSON-encoded string). For example
        **'["-m", "0"]'** could be used as **mkfsOptions** for an **ext4**
        volume.
      - Set **volumeBindingMode** as **WaitForFirstConsumer**
        in order to delay the binding and provisioning of a Pod until a Pod
        using the **PersistentVolumeClaim** is created.

#. Create the **StorageClass**.

   .. code-block:: shell

      root@bootstrap $ kubectl apply -f storageclass.yml

#. Check that the **StorageClass** has been created.

   .. code-block:: shell

      root@bootstrap $ kubectl get storageclass <storageclass_name>
      NAME                         PROVISIONER                    AGE
      <storageclass_name>          kubernetes.io/no-provisioner   2s
