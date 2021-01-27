Bootstrap Node Backup and Restoration
=====================================

This section describes how to manually back up a MetalK8s bootstrap node,
and how to restore a bootstrap node from such backup.

.. note::

   A backup is run automatically:

   - at the end of the bootstrap,

   - at the beginning of the upgrade/downgrade,

   - at the end of the upgrade/downgrade,

   - at the end of a bootstrap restoration.

Backing up a Bootstrap Node
***************************

A backup file is generated at the end of the bootstrap.

To create a new backup file run the following command:

.. code::

    /srv/scality/metalk8s-X.X.X/backup.sh

Backup archives are stored in ``/var/lib/metalk8s/``.

Restoring a Bootstrap Node
**************************

.. warning::

   You must have a highly available control plane with at least
   3 members in the ``etcd`` cluster (including the failed bootstrap node),
   to use the restore script.

.. note::

   To restore a bootstrap node you need a backup archive and MetalK8s ISOs.
   All the ISOs referenced in the bootstrap configuration file (located in
   ``/etc/metalk8s/bootstrap.yaml``) must be present.

#. Unregister the unreachable ``etcd`` member from the cluster by running
   the following commands from a working node with the ``etcd`` role:

   .. code::

      # Get etcd container id
      CONT_ID=$(crictl ps -q --label io.kubernetes.container.name=etcd --state Running)

      # List all etcd members to get the ID of the etcd member that need to be removed
      crictl exec -it "$CONT_ID" \
         etcdctl --endpoints https://localhost:2379 \
         --cacert /etc/kubernetes/pki/etcd/ca.crt \
         --key /etc/kubernetes/pki/etcd/server.key \
         --cert /etc/kubernetes/pki/etcd/server.crt \
         member list

      # Remove the etcd member (replace <etcd_id> in the command)
      crictl exec -it "$CONT_ID" \
         etcdctl --endpoints https://localhost:2379 \
         --cacert /etc/kubernetes/pki/etcd/ca.crt \
         --key /etc/kubernetes/pki/etcd/server.key \
         --cert /etc/kubernetes/pki/etcd/server.crt \
         member remove <etcd_id>

#. Since multiple bootstrap nodes are not supported for the moment, remove
   the old bootstrap node before performing the restoration by running the
   following commands from a working Node with ``master`` role:

   .. code::

      # List all nodes to get the node name of the old bootstrap node that need
      # to get removed
      kubectl get node --selector="node-role.kubernetes.io/bootstrap" \
         --kubeconfig=/etc/kubernetes/admin.conf

      # Remove the old bootstrap node (replace <node_name> in the command)
      kubectl delete node <node_name> --kubeconfig=/etc/kubernetes/admin.conf

#. Mount the ISO.

#. Restore the bootstrap node.

   .. code::

      /srv/scality/metalk8s-X.X.X/restore.sh --backup-file <backup_archive> --apiserver-node-ip <node_ip>

.. note::

    Replace ``<backup_archive>`` with the path to the backup archive you want
    to use, and ``<node_ip>`` with a control-plane IP of one control-plane node.
