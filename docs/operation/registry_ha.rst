Registry HA
===========

To be able to run fully offline, MetalK8s comes with its own registry serving
all necessary images used by its containers.
This registry container sits on the Bootstrap node.

With a highly available registry, container images are served by multiple
nodes, which means the Bootstrap node can be lost without impacting the
cluster.
It allows pods to be scheduled, even if the needed images are not cached
locally.

.. note::

  This procedure only talk about registry HA as Bootstrap HA is not
  supported for the moment, so it's only a part of the Bootstrap
  functionnaly. Check this ticket for more informations
  https://github.com/scality/metalk8s/issues/2002

Prepare the node
----------------

To configure a node to host a registry, a ``repository`` pod must be scheduled
on it.
This node must be part of the MetalK8s cluster and no specific roles or
taints are needed.

All ISOs listed in the ``archives`` section of
``/etc/metalk8s/bootstrap.yaml`` and ``/etc/metalk8s/solutions.yaml``
must be copied from the Bootstrap node to the target node at exactly the same
location.

Deploy the registry
-------------------

Connect to the node where you want to deploy the registry and run the
following salt states

- Prepare all the MetalK8s ISOs

  .. parsed-literal::

    root@node-1 $ salt-call state.sls \\
        metalk8s.archives.mounted \\
        saltenv=metalk8s-|version|

- If you have some solutions, prepare the solutions ISOs

  .. parsed-literal::

    root@node-1 $ salt-call state.sls \\
        metalk8s.solutions.available \\
        saltenv=metalk8s-|version|

- Deploy the registry container

  .. parsed-literal::

    root@node-1 $ salt-call state.sls \\
        metalk8s.repo.installed \\
        saltenv=metalk8s-|version|


Reconfigure the container engines
---------------------------------

Containerd must be reconfigured to add the freshly deployed registry to its
endpoints and so it can still pull images in case the Bootstrap node's one is
down.

From the Bootstrap node, run (replace ``<bootstrap_node_name>`` with the
actual Bootstrap node name):

.. parsed-literal::

  root@bootstrap $ kubectl exec -n kube-system -c salt-master \\
     --kubeconfig=/etc/kubernetes/admin.conf \\
     salt-master-<bootstrap_node_name> -- salt '*' state.sls \\
     metalk8s.container-engine saltenv=metalk8s-|version|
