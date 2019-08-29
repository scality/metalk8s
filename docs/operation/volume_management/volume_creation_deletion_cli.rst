Volume Workflow CLI Operations
==============================
To use persistent volumes within a MetalK8s cluster, a volume object needs
to be created. Volume objects depend on StorageClasses to function properly.

Volume Creation CLI
-------------------
This section highlights how to create volume objects in a MetalK8s cluster
using the **CLI**.

.. important::
   Before performing any of the volume creation steps below, ensure that
   you have completed the storageclass creation procedure listed in
   :doc:`/operation/volume_workflow/storageclass_creation`

#. Create a sample volume.

   Save the volume definition file as **volume.yml**.

   .. code-block:: shell

       apiVersion: storage.metalk8s.scality.com/v1alpha1
       kind: Volume
       metadata:
         name: <volume_name>
       spec:
         nodeName: <node_name>
         storageClassName: <storageclass_name>
         rawBlockDevice:
           devicePath: <device_path>

#. Apply the volume.

   .. code-block:: shell

      root@bootstrap $ kubectl apply -f volume.yml


#. Verify that the volume was created.

   .. code-block:: shell

       root@bootstrap $ kubectl get volume <volume_name>

       [root@bootstrap]# kubectl get volume demo-volume
       NAME          NODE        STORAGECLASS
       demo-volume   bootstrap   metalk8s-demo-storageclass

Volume Deletion CLI
-------------------
This section highlights how to delete a volume object in a MetalK8s cluster
using the **CLI**

#. Delete a volume.

   .. code-block:: shell

     root@bootstrap $ kubectl delete volume <volume_name>

     [root@bootstrap]# kubectl delete volume demo-volume
     volume.storage.metalk8s.scality.com "demo-volume" deleted


#. Verify that the volume was deleted.

.. note::
   The command below will return a list of all volumes. The deleted volume entry
   should not be found in the list.

   .. code-block:: shell

       root@bootstrap $ kubectl get volume
