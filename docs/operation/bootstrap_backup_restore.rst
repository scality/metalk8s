Bootstrap Node Backup and Restoration Procedure
===============================================

This section describes how to backup a **MetalK8s** bootstrap node
and how to restore a bootstrap node from such backup.

Backup procedure
****************

A backup file is generated at the end of the bootstrap.

To create a new backup file you can run the following command:

.. code::

    /srv/scality/metalk8s-X.X.X/backup.sh

Backup archives are stored in `/var/lib/metalk8s/`.

Restoration procedure
*********************

.. warning::

    You cannot use the restore script if you do not have High Availability
    apiserver because some information required to reconfigure the others
    nodes are stored in the apiserver.

.. warning::

    In case of a 3-node etcd cluster (2 nodes + unreachable old bootstrap node)
    you need to remove the old bootstrap node from the etcd cluster before
    running the restore script.

To restore a bootstrap node you need a backup archive and **MetalK8s** ISOs.

All the ISOs referenced in the bootstrap configuration file
(located at `/etc/metalk8s/bootstrap.yaml`) must be present.

First mount the ISO and then run the restore script:

.. code::

    /srv/scality/metalk8s-X.X.X/restore.sh --backup-file <backup_archive>

.. note::

    Replace `<backup_archive>` with the path to the backup archive you want
    to use.
