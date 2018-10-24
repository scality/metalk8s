Replacing a disk
================

To change the disk of a server, first put the node into a maintenance
state. (TODO: link to node maintenance)

.. note::

  Before shutting the server, remove any usage to the drive.

Once the server is on maintenance, run:

.. code::

  (metalk8s) $ ansible-playbook -b -i <inventory>/hosts playbooks/unmount_drive.yml


This prompts the required information interactively:

.. code::

  Please provide a node name affected by a disk failure
    metalk8s-node-0
    metalk8s-node-1
    metalk8s-node-2
    metalk8s-node-3
    metalk8s-node-4
  : <selected_node>
  Please provide a disk name: <driver_path>


The required information can also be provided via the command line argument:

.. code::

   (metalk8s) $ ansible-playbook -b -i <inventory>/hosts playbooks/unmount_drive.yml -e selected_node=metalk8s-node-3 -e disk_to_replace=vdb

The playbook will:
- remove pvc associated with a pv backed by the disk
- remove those pv
- unmount lvm and remove the mount point
- remove all lvm on the selected disk
- remove the disk of it's volume group

Then:

1. Shutdown the node.
#. Remove the drive from its enclosure.
#. Place a new drive.
#. Restart the node.
#. Check the drive is detected correctly.
#. Change the inventory to match the new disk name.

You can do storage provisionning (TODO: link storage provisionning)

.. code::

  (metalk8s) $ ansible-playbook -b -i <inventory>/hosts playbooks/deploy.yml -t storage


Once done, put back the node into the cluster. (TODO: link to node
maintenance)
