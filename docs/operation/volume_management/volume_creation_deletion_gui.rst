Volume Management using the UI
==============================

This section describes the creation and deletion of MetalK8s **Volume**
using the MetalK8s UI.
In order to create Volumes you need to have StorageClass objects registered in
your cluster. See :doc:`/operation/volume_management/storageclass_creation`

Volume Creation
---------------

To access the UI, refer to
:ref:`this procedure <installation-services-admin-ui>`

#. Navigate to the **Nodes** list page, by clicking the button in the sidebar:

    .. image:: /operation/volume_management/img/node_list.png

#. From the Node list, select the node you would like to create
   a volume on

    .. image:: /operation/volume_management/img/all_nodes.png

#. Navigate to the **Volumes** tab

    .. image:: /operation/volume_management/img/node_detail.png

#. Click the **+** button to create a volume

    .. image:: /operation/volume_management/img/create_volume.png

#. Fill out the respective fields

    .. image:: /operation/volume_management/img/volume_creation.png

    - **Name**: Denotes the volume name.
    - **Labels**: A set of key/value pairs that are used by Persistent Volume Claims to select the right Persistent Volumes.
    - **Storage Class**: Refer to the storage class creation page listed here:
      :doc:`/operation/volume_management/storageclass_creation`
    - **Type**: Metalk8s currently only supports **RawBlockDevice** and
      **SparseLoopDevice**.
    - **Device path**: Refers to the path of an existing storage device.

#. Finally, click the **Create** button

    .. image:: /operation/volume_management/img/test_volume.png

#. You should have a new volume listed in the **Volume list**

    .. image:: /operation/volume_management/img/volume_created.png

#. If you click on any volume in the Volume list,
   you will see more information in the Volume detail view:

    .. image:: /operation/volume_management/img/volume_detail.png


Volume Deletion
---------------

#. To delete a volume from the MetalK8s UI, from the volume listing, click the
   delete button

    .. image:: /operation/volume_management/img/volume_delete.png

#. Confirm the volume deletion request by clicking the **Delete** button

    .. image:: /operation/volume_management/img/volume_delete_confirmation.png
