Roles
=====
The various roles of servers are defined as follows:

Minion
------
A server running a Salt minion, configured to talk to the Salt master, and (at
deployment time) with a key accepted by the master.

Bootstrap
---------
A bootstrap node, though *only* concerning services *not* running on other
nodes. I.e. this includes Salt master, package repository, OCI image registry,
but *not* `etcd`, `kube-apiserver`, the lot. Other than that, it's like an
`infra` node.

CA
--
The cluster CA, not running any services.

Master
------
A Kubernetes control-plane node. Basically, runs `kube-apiserver`,
`kube-controller-manager` and `kube-scheduler`, managed by Kubelet. This role
does *not* require CNI: all services are running in the host network namespace.

Etcd
----
An `etcd` cluster member, managed by Kubelet. This node does *not* require CNI:
all services are running in the host network namespace.

Node
----
A plain Kubernetes node. Runs `kubelet`, configured to talk to the API-server,
and has CNI enabled.

Infra
-----
This is basically a `node` with some specific taints set.
