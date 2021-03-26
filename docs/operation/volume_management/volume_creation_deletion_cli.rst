Volume Management Using the CLI
===============================

This topic describes how to create and delete a MetalK8s Volume
using the CLI.
Volume objects enable a declarative provisioning of persistent storage, to
use in Kubernetes workloads (through PersistentVolumes).

Requirements
------------

- StorageClass objects must be registered in your cluster to create
  Volumes. For more information refer to
  :doc:`/operation/volume_management/storageclass_creation`.

Creating a Volume
-----------------

#. Create a Volume manifest using one of the following templates:

   .. jinja:: volume_values

       {%- for volume_type, volume_info in volume_types.items() %}

       {{ volume_type }} Volumes
       ^^^^^^^^^^^^^^^^^^^^^^^^^

       .. code-block:: yaml

       {{ volume_info["basic"] | indent(8, first=true) }}


       Set the following fields:

       {% for key, info in common_fields.items() %}
       - **{{ key }}**: {{ info }}.
       {% endfor %}
       {% for key, info in volume_info["fields"].items() %}
       - **{{ key }}**: {{ info }}.
       {% endfor %}
       {% endfor %}

#. Create the Volume.

   .. code-block:: shell

      root@bootstrap $ kubectl apply -f volume.yml

#. Check that the Volume has been created.

   .. code-block:: shell

       root@bootstrap $ kubectl get volume <volume_name>
       NAME             NODE        STORAGECLASS
       <volume_name>   bootstrap   metalk8s-demo-storageclass

Deleting a Volume
-----------------

.. note::

   A Volume object can only be deleted if there is no backing storage,
   or if the volume is not in use. Otherwise, the volume will be
   marked for deletion and remain available until one of the conditions
   is met.

#. Delete a Volume.

   .. code-block:: shell

      root@bootstrap $ kubectl delete volume <volume_name>
      volume.storage.metalk8s.scality.com <volume_name> deleted


#. Check that the Volume has been deleted.

   .. note::

      The command below returns a list of all volumes.
      The deleted volume entry should not be found in the list.

   .. code-block:: shell

      root@bootstrap $ kubectl get volume
