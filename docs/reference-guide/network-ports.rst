Network Ports
=============

etcd Ports
----------

etcd is a cluster of servers storing keys and values
distributing a database.

+----------+-------------------+-------------------+
|   Port   |  Service/daemon   |     Clients       |
+==========+===================+===================+
|   2380   |     etcd peer     |    etcd peer      |
+----------+-------------------+-------------------+
|   2379   |      etcd         |  user, api server |
+----------+-------------------+-------------------+
|   9100   |   every server    | node exporter     |
+----------+-------------------+-------------------+

kubernetes-master Ports
-----------------------

Kubernetes master components (api server, control manager,
scheduler, node exporter) manage and monitor the whole cluster,
such as tasking pods, listing nodes etc.

+----------+-------------------+----------------------------+
|   Port   |  Service/daemon   |  Clients                   |
+==========+===================+============================+
|   6443   |    api server     | users, control manager,    |
|          |                   | scheduler                  |
+----------+-------------------+----------------------------+
|  10250   |    api server     | kubelet                    |
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

