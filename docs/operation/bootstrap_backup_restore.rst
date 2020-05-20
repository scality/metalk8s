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

   It is mandatory to have a highly available control plane, with at least
   3 members in the ``etcd`` cluster (including the failed bootstrap Node),
   to use the restore script.

Before running the script, the unreachable ``etcd`` member needs to be
unregistered from the cluster. To do so, run the following commands
from a working Node with the ``etcd`` role:

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

Since multiple bootstrap nodes are not supported for the moment, the old
bootstrap Node needs to be removed before performing the restoration. To do so,
run the following commands from a working Node with ``master`` role:

.. code::

  # List all nodes to get the node name of the old bootstrap node that need
  # to get removed
  kubectl get node --selector="node-role.kubernetes.io/bootstrap" \
     --kubeconfig=/etc/kubernetes/admin.conf

  # Remove the old bootstrap node (replace <node_name> in the command)
  kubectl delete node <node_name> --kubeconfig=/etc/kubernetes/admin.conf

To restore a bootstrap node you need a backup archive and **MetalK8s** ISOs.

All the ISOs referenced in the bootstrap configuration file
(located at `/etc/metalk8s/bootstrap.yaml`) must be present.

First mount the ISO and then run the restore script:

.. code::

   /srv/scality/metalk8s-X.X.X/restore.sh --backup-file <backup_archive> --apiserver-node-ip <node_ip>

.. note::

    Replace `<backup_archive>` with the path to the backup archive you want
    to use and `<node_ip>` with a control-plane IP of one control-plane Node.
