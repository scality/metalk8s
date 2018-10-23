Node Maintenance
================

There is typical situation where, putting a node into maintenance mode is useful:

  * Upgrading nodes without service downtime
  * Repair hardware defects affecting nodes


kubectl drain
-------------

To remove a node from a kubernetes cluster, you require admin credentials like the one generated
during the setup of metalk8s (TODO: link quick start). Then you need to get the kubernetes node name
of the node you wish stop being part of the cluster. To get the list of node names you
can use and then verify the properties of a specific node, when you have selected a candidate

.. code-block::

   $ kubectl get nodes -o wide
   $ kubectl describe node node-1

The removal of a node is done via the command `drain` (TODO: link kubernetes documentation) of kubectl

.. code-block::

    $ kubectl drain node-1

This command has two actions: prevent kubernetes schedule new workload on the node and evict current
workload. Depending on the workload being held by the node, kubernetes might refuse to evict sensitive
workload. You will be prompt to add some overide on the command line (TODO: link kubernetes documentation)
in order to continue

.. code-clock::

    $ kubectl drain node-1 --delete-local-data --ignore-daemonsets


kubectl uncordon
----------------

To put a server back to the cluster, you should tell the kubernetes controlplain that the new node
can accept workload. This is done via the command `uncordon` (TODO: link kubernetes documentation)
of kubectl

.. code-block::

    $ kubectl uncordon node-1
