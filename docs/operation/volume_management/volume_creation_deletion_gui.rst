Volume Management using the UI
==============================

This section describes how to create and delete a MetalK8s **Volume**
using the MetalK8s **UI**.

.. important::

   **StorageClass** objects must be registered in your cluster to create
   volumes. For more information refer to :doc:`/operation/volume_management/storageclass_creation`.

Creating a Volume
-----------------

.. note::

   To access the MetalK8s UI, refer to
   :ref:`this procedure <installation-services-admin-ui>`.

#. Click **Nodes** on the sidebar to access the Node list.

    .. image:: /operation/volume_management/img/node_list.png

#. From the Node list, select the node you want to create
   a volume on.

    .. image:: /operation/volume_management/img/all_nodes.png

#. Go to the **Volumes** tab.

    .. image:: /operation/volume_management/img/node_detail.png

#. Click **+** on the top right corner to create a volume.

    .. image:: /operation/volume_management/img/create_volume.png

#. Fill in the respective fields.

    .. image:: /operation/volume_management/img/volume_creation.png

    - **Name**: Denotes the volume name.
    - **Labels**: A set of key/value pairs that are used by Persistent Volume Claims to select the right Persistent Volumes.
    - **Storage Class**: Refers to :doc:`/operation/volume_management/storageclass_creation`.
    - **Type**: MetalK8s currently only supports **RawBlockDevice** and
      **SparseLoopDevice**.
    - **Device path**: Refers to the path of an existing storage device.

#. Click **Create** on the bottom right corner.

   .. image:: /operation/volume_management/img/test_volume.png

   A new volume should be listed in the **Volume list**.

    .. image:: /operation/volume_management/img/volume_created.png

#. Click any volume in the Volume list to see more information about it
   in the Volume detail view.

    .. image:: /operation/volume_management/img/volume_detail.png

Delete a Volume
---------------

#. From the Volume listing view, click the trash icon on the top right corner.

    .. image:: /operation/volume_management/img/volume_delete.png

#. Confirm the volume deletion request by clicking **Delete**.

    .. image:: /operation/volume_management/img/volume_delete_confirmation.png
