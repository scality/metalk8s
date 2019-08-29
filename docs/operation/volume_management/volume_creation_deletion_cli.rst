Volume Management using the CLI
===============================

To use persistent storage in a MetalK8s cluster, one needs to create **Volume**
objects.
In order to create Volumes you need to have **StorageClass** objects registered
in your cluster. See :doc:`/operation/volume_management/storageclass_creation`

Volume Creation
---------------

This section describes how to create a **Volume** from the **CLI**.

#. Create a **Volume** manifest

   You can define a new **Volume** using the following template:

   .. code-block:: yaml

       apiVersion: storage.metalk8s.scality.com/v1alpha1
       kind: Volume
       metadata:
         name: <volume_name>
       spec:
         nodeName: <node_name>
         storageClassName: <storageclass_name>
         rawBlockDevice:
           devicePath: <device_path>

   Set the following fields:

   - **name**: the name of your volume, must be unique
   - **nodeName**: the name of the node where the volume will be located.
   - **storageClassName**: the **StorageClass** to use
   - **devicePath**: path to the block device (for example, `/dev/sda1`).

#. Create the **Volume**

   .. code-block:: shell

      root@bootstrap $ kubectl apply -f volume.yml


#. Verify that the **Volume** was created

   .. code-block:: shell

       root@bootstrap $ kubectl get volume <volume_name>
       NAME             NODE        STORAGECLASS
       <volume_name>   bootstrap   metalk8s-demo-storageclass

Volume Deletion
---------------

This section highlights how to delete a **Volume** in a MetalK8s cluster
using the **CLI**

  .. note:

     A **Volume** object can only be deleted if:
     - There is no backing storage.
     - The volume is not in use.

     Otherwise, the volume will simply be marked for deletion and remain
     available until one of the above condition is met.

#. Delete a **Volume**

   .. code-block:: shell

     root@bootstrap $ kubectl delete volume <volume_name>
     volume.storage.metalk8s.scality.com <volume_name> deleted


#. Check that the **Volume** has been deleted

   .. note::
      The command below returns a list of all volumes.
      The deleted volume entry should not be found in the list.

   .. code-block:: shell

      root@bootstrap $ kubectl get volume
