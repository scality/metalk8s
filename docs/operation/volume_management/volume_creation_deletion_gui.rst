Volume Management Using the UI
==============================

This topic describes how to create and delete a MetalK8s Volume
using the MetalK8s UI.

Requirements
------------

- StorageClass objects must be registered in your cluster to create
  Volumes. For more information refer to
  :doc:`/operation/volume_management/storageclass_creation`.

- Access the MetalK8s UI. Refer to
  :ref:`this procedure <installation-services-admin-ui>`.

Creating a Volume
-----------------

#. Click **Nodes** on the sidebar to access the node list.

   .. image:: /operation/volume_management/img/node_list.png

#. On the node list, select the node you want to create a volume on.

#. Go to the **Volumes** tab and click **+ Create Volume**.

   .. image:: /operation/volume_management/img/volume_tab.png

#. Fill in the respective fields, and click **Create**.

   - **Name**: Denotes the volume name.
   - **Labels**: A set of key/value pairs used by PersistentVolumeClaims to
     select the right PersistentVolumes.
   - **Storage Class**: Refers to
     :doc:`/operation/volume_management/storageclass_creation`.
   - **Type**: MetalK8s currently only supports RawBlockDevice and
     SparseLoopDevice.
   - **Device path**: Refers to the path of an existing storage device.

   .. image:: /operation/volume_management/img/volume_creation.png
      :scale: 40%

#. Click **Volumes** on the sidebar to access the volume list.
   The new volume created appears in the list.

   .. image:: /operation/volume_management/img/volume_list.png

Deleting a Volume
-----------------

#. Click **Volumes** on the sidebar to access the volume list, and select
   the volume you want to delete.

#. Go to the **Overview** tab, click **Delete Volume**.

   .. image:: /operation/volume_management/img/volume_overview_delete.png

#. Confirm the volume deletion request by clicking **Delete**.

   .. image:: /operation/volume_management/img/volume_delete_confirmation.png
      :scale: 50%
