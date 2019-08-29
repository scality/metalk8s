Volume Workflow GUI Operations
==============================
This section highlights the creation and deletion of MetalK8s volume objects
using the MetalK8s GUI.

Volume Creation GUI
-------------------

.. important::
   Before performing volume creation steps below, ensure that
   you have completed the storageclass creation procedure listed in
   :doc:`/operation/volume_workflow/storageclass_creation`

To access the UI, refer to :ref:`this procedure <quickstart-services-admin-ui>`

#. Navigate to the **Nodes** list page, by clicking the button in the sidebar:

    .. image:: /operation/volume_workflow/img/node_list.png

#. From the Node list, select the node you would like to create
   a volume on.

    .. image:: /operation/volume_workflow/img/all_nodes.png

#. Navigate to the **Volumes** tab.

    .. image:: /operation/volume_workflow/img/node_detail.png

#. Click the **Create a New Volume** button

    .. image:: /operation/volume_workflow/img/create_volume.png

#. Fill out the respective fields.

    .. image:: /operation/volume_workflow/img/volume_detail.png

    - Name: Denotes the volume name.
    - Storage Class: Refer to the storage class creation page listed here:
      :doc:`/operation/volume_workflow/storageclass_creation`
    - Type: Metalk8s currently only supports **RawBlockDevice** and
      **SparseLoopDevice**.

#. Finally, click the **Create** button.

    .. image:: /operation/volume_workflow/img/test_volume.png

#. You should have a new volume enlisted in the **Volume list**.

    .. image:: /operation/volume_workflow/img/volume_created.png


Volume Deletion GUI
-------------------

.. note::
   MetalK8s makes it possible to delete a volume from the GUI. Once a volume
   is deleted, you will not be able to access it any longer.

To delete a volume from the MetalK8s GUI, from the volume listing, click the
the delete button.

    .. image:: /operation/volume_workflow/img/volume_delete.png
