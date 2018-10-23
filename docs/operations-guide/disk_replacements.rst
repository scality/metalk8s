Disk replacement
================

To change disk of a server you first need to put the node into maintenance (TODO: link to node maintenance)
Before shutting the server it's advisable to remove any usage to the drive.
Once your server is into maintenance you can run:

.. code-block::

  (metalk8s) $ ansible-playbook -b -i <inventory>/hosts playbooks/unmount_drive.yml


This will prompt you the required information interactivaly:

.. code-block::

  Please provide a node name affected by a disk failure
    metalk8s-node-0
    metalk8s-node-1
    metalk8s-node-2
    metalk8s-node-3
    metalk8s-node-4
  : <selected_node>
  Please provide a disk name: <driver_path>


You can also provide the required information via command line argument:

.. code-block::

   (metalk8s) $ ansible-playbook -b -i <inventory>/hosts playbooks/unmount_drive.yml -e selected_node=metalk8s-node-3 -e disk_to_replace=vdb

The playbook will do:
- remove pvc associated with a pv backed by the disk
- remove those pv
- umount lvm and remove the mount point
- remove all lvm on the selected disk
- remove the disk of it's volume group

You can then shutdown your node, remove drive from it's enclosure and place a new drive.
Start again your node, check the drive is detected correctly and change the inventory to match
the new disk name. You can do storage provisionning (TODO: link storage provisionning)

.. code-block::

  (metalk8s) $ ansible-playbook -b -i <inventory>/hosts playbooks/deploy.yml -t storage


Once done, you can put back the node into the cluster. (TODO: link to node maintenance)
