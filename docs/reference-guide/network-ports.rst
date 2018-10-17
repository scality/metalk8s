Network Ports
=============

In the cluster, each Ansible group need ports to be
open to communicate with each other. 

etcd Ports
----------

etcd is a distributed key value store. It provides a way
to store data across a cluster of machines. It can be used
by applications either to read or write data.

+----------+-------------------+-------------------+
|   Port   |   Service/daemon  |     Clients       |
+==========+===================+===================+
|   2380   |  etcd/etcd peer   |    etcd peers     |
+----------+-------------------+-------------------+
|   2379   |      etcd         |  * userapi        |
|          |                   |  * server         |
+----------+-------------------+-------------------+
|   9100   | Prometheus        |  Prometheus       |
|          | node-exporter     |                   |
+----------+-------------------+-------------------+

kubernetes-master Ports
-----------------------

Kubernetes master components (api server, control manager,
scheduler, node exporter) manage and monitor the whole cluster,
such as tasking pods, listing nodes etc.

+----------+-------------------+----------------------------+
|   Port   |  Service/daemon   |  Clients                   |
+==========+===================+============================+
|   6443   |    API server     |  * control manager         |
|          |                   |  * scheduler               |
+----------+-------------------+----------------------------+
|  10250   |    API server     | kubelet                    |
+----------+-------------------+----------------------------+


kubernetes-node Ports
---------------------

Kubernetes nodes are the nodes storing data. Each node has kubelet
running on it, which is a daemon managing containers, reporting the
available resources and running the server.

+--------------+----------------+---------------------------+
|     Port     | Service/daemon |  Clients                  |
+==============+================+===========================+
|   443 / 80   |    nginx       |   Cloud                   |
+--------------+----------------+---------------------------+

