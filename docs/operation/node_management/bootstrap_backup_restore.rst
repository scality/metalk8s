Backing Up and Restoring a Bootstrap Node
=========================================

This section describes how to backup a **MetalK8s** bootstrap node
and how to restore a bootstrap node from a backup.

Backing Up a Node
*****************

A backup file is generated at the end of the bootstrap.

Create a new backup file by running the following command:

.. code::

    /srv/scality/metalk8s-X.X.X/backup.sh

Backup archives are stored in ``/var/lib/metalk8s/``.

Restoring a Node
****************

.. warning::

   To use the restore script, it is mandatory to have a highly available
   control plane, with at least three members in the ``etcd`` cluster
   (including the failed bootstrap Node).

Before running the script, the unreachable ``etcd`` member needs to be
unregistered from the cluster. To do so, run the following commands
from a working Node with the ``etcd`` role:

.. code::

   # Get etcd container id
   CONT_ID=$(crictl ps -q --label io.kubernetes.container.name=etcd --state Running)

   # List all etcd members to get the ID of the etcd member that need to be removed
   crictl exec -it "$CONT_ID" \
      etcdctl --endpoints https://localhost:2379 \
      --ca-file /etc/kubernetes/pki/etcd/ca.crt \
      --key-file /etc/kubernetes/pki/etcd/server.key \
      --cert-file /etc/kubernetes/pki/etcd/server.crt \
      member list

   # Remove the etcd member (replace <etcd_id> in the command)
   crictl exec -it "$CONT_ID" \
      etcdctl --endpoints https://localhost:2379 \
      --ca-file /etc/kubernetes/pki/etcd/ca.crt \
      --key-file /etc/kubernetes/pki/etcd/server.key \
      --cert-file /etc/kubernetes/pki/etcd/server.crt \
      member remove <etcd_id>

A backup archive and MetalK8s ISOs are required to perform the restoration.

The ISOs referenced in the bootstrap configuration file
(located at ``/etc/metalk8s/bootstrap.yaml``) must be present.

#. Mount the ISO.

#. Run the restore script.

   .. code::

      /srv/scality/metalk8s-X.X.X/restore.sh --backup-file <backup_archive> --apiserver-node-ip <node_ip>

.. note::

    Replace `<backup_archive>` with the path to the backup archive you want
    to use and `<node_ip>` with a control-plane IP of one control-plane Node.
