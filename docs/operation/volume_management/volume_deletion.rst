Removing Volumes
================

This section highlights how to delete a **Volume** in a MetalK8s cluster.

Requirements
------------

A volume can be removed under the following conditions:

- There is no backing storage.
- The volume is not in use.

Otherwise, the volume will be marked for deletion and remains
available until one of the above conditions is met.

Using the CLI
-------------

Run the following command to delete the volume.

.. code-block:: shell

   root@bootstrap $ kubectl delete volume <volume_name>
   volume.storage.metalk8s.scality.com <volume_name> deleted


Check if the volume is successfully removed by running the following command.

.. code-block:: shell

      root@bootstrap $ kubectl get volume

The deleted volume entry must not appear in the list returned by the command.

Using the UI
------------

#. From the **Nodes** list, select the node on which the volume is created.

#. Click the **Volumes** tab, and click the bin icon from the **Action**
   column.

    .. image:: /operation/volume_management/img/volume_delete.png

#. Click the **Delete** button to confirm the volume's deletion.

    .. image:: /operation/volume_management/img/volume_delete_confirmation.png
