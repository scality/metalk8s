Node Maintenance
================

Putting a node into a maintenance state helps to:

  * Upgrade nodes without service downtime
  * Repair hardware defects affecting nodes


kubectl drain
-------------

Removing a node from a kubernetes cluster requires admin credentials,
as those generated for the MetalK8s installation.
Then, get the kubernetes node name of the node to remove from the
cluster. To get the list of nodes than can be used
and to verify the properties of a specific node, select a candidate
and run:

::

    $ kubectl get nodes -o wide
    $ kubectl describe node node-1

The removal of a node is done via the command `drain` (TODO: link
kubernetes documentation) of kubectl:

::

    $ kubectl drain node-1

This command has two actions:
* it prevents kubernetes to schedule new workload on the node
* it evicts the current workload.
Depending on the workload being held by the node, kubernetes might
refuse to evict sensitive workload. A prompt to add some override on
the command line (TODO: link kubernetes documentation) appears.
Continue by running:

::

    $ kubectl drain node-1 --delete-local-data --ignore-daemonsets


kubectl uncordon
----------------

To put a server back to the cluster, use the kubetcl `uncordon`
command for the kubernetes controlplain to know that the new node
can accept workload.

::

    $ kubectl uncordon node-1
