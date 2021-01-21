Volume Management using the CLI
===============================

This section describes how to create and delete a MetalK8s **Volume**
using the **CLI**.
To use persistent storage in a MetalK8s cluster, you need to create
**Volume** objects.

.. important::

   **StorageClass** objects must be registered in your cluster to create
   volumes. For more information refer to :doc:`/operation/volume_management/storageclass_creation`.

Creating a Volume
-----------------

#. Create a **Volume** manifest.

   You can define a new **Volume** using the following template:

   .. code-block:: yaml

       apiVersion: storage.metalk8s.scality.com/v1alpha1
       kind: Volume
       metadata:
         name: <volume_name>
       spec:
         nodeName: <node_name>
         storageClassName: <storageclass_name>
         mode: "Filesystem"
         rawBlockDevice:
           devicePath: <device_path>

   Set the following fields:

   - **name**: the name of your volume, must be unique.
   - **nodeName**: the name of the node where the volume will be located.
   - **storageClassName**: the **StorageClass** to use.
   - **mode**: describes how the volume is intended to be consumed, either
     Block or Filesystem (default to Filesystem if not specified).
   - **devicePath**: path to the block device (for example: `/dev/sda1`).

#. Create the **Volume**.

   .. code-block:: shell

      root@bootstrap $ kubectl apply -f volume.yml


#. Check that the **Volume** has been created.

   .. code-block:: shell

       root@bootstrap $ kubectl get volume <volume_name>
       NAME             NODE        STORAGECLASS
       <volume_name>   bootstrap   metalk8s-demo-storageclass

Deleting a Volume
-----------------

.. note::

   A **Volume** object can only be deleted if there is no backing storage,
   or if the volume is not in use. Otherwise, the volume will simply be
   marked for deletion and remain available until one of the conditions
   is met.

#. Delete a **Volume**.

   .. code-block:: shell

      root@bootstrap $ kubectl delete volume <volume_name>
      volume.storage.metalk8s.scality.com <volume_name> deleted


#. Check that the **Volume** has been deleted.

   .. note::

      The command below returns a list of all volumes.
      The deleted volume entry should not be found in the list.

   .. code-block:: shell

      root@bootstrap $ kubectl get volume
