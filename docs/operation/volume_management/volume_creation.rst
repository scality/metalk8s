Creating Volumes
================

Create **Volume** objects to use persistent storage in a MetalK8s cluster.

Requirements
------------

:doc:`StorageClass Objects
</operation/volume_management/storageclass_creation>` are registered in the
cluster.

Using the CLI
-------------

#. Create a **Volume** manifest.

   You can define a new volume using the following template:

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

   - **name**: the name of your volume, must be unique.
   - **nodeName**: the name of the node where the volume will be located.
   - **storageClassName**: the name of the **StorageClass** to use.
   - **devicePath**: path to the block device (for example, ``/dev/sda1``).

#. Create the volume.

   .. code-block:: shell

      root@bootstrap $ kubectl apply -f volume.yml


To check if the volume is successfully created, run the following command.

   .. code-block:: shell

       root@bootstrap $ kubectl get volume <volume_name>
       NAME             NODE        STORAGECLASS
       <volume_name>   bootstrap   metalk8s-demo-storageclass

Using the UI
------------

#. Click **Nodes** on the left menu.

    .. image:: /operation/volume_management/img/node_list.png

#. Select the node on which to create the volume.

    .. image:: /operation/volume_management/img/all_nodes.png

#. Click the **Volumes** tab.

    .. image:: /operation/volume_management/img/node_detail.png

#. Click the **+** button.

    .. image:: /operation/volume_management/img/create_volume.png

#. Fill out the respective fields.

    .. image:: /operation/volume_management/img/volume_creation.png

    - **Name**: Volume name.
    - **Labels**: Set of key/value pairs that are used by Persistent Volume Claims to select the right Persistent Volumes.
    - **Storage Class**: :doc:`StorageClass Object </operation/volume_management/storageclass_creation>` to use.
    - **Type**: Metalk8s currently only supports **RawBlockDevice** and
      **SparseLoopDevice**.
    - **Device path**: Path of an existing storage device.

#. Click the **Create** button.

    .. image:: /operation/volume_management/img/test_volume.png

To check if the volume has been successfully created, go back to the
**Volumes** page.

.. image:: /operation/volume_management/img/volume_created.png

Clicking on the volume provides detailed information.

.. image:: /operation/volume_management/img/volume_detail.png
