Managing etcd
=============
`etcd`_ is a distributed key value store that provides a reliable way to store
data across a cluster of machines. This database is the cornerstone of any
Kubernetes installation, keeping records of all objects in the cluster.

.. _etcd: https://coreos.com/etcd/

As part of a MetalK8s deployment, an :program:`etcd` cluster is installed on
members of the ``etcd`` group of your inventory.

Access to the :program:`etcd` cluster is secured by TLS and client
certificates. The :command:`etcdctl` tool is available on :program:`etcd`
cluster nodes in :file:`/usr/local/bin` to interact with the service. To ease
management of the :program:`etcd` cluster, a script to setup the shell
environment to include :file:`/usr/local/bin` in :envvar:`PATH` and export the
required TLS CA, certificate and key file paths and cluster endpoints is
created on every ``etcd`` node as :file:`/etc/metalk8s/etcd.env.sh`.

To use :command:`etcdctl`, get a ``root`` shell, and run

.. code-block:: shell

   source /etc/metalk8s/etcd.env.sh

.. note:: Kubernetes uses version 3 of the :program:`etcd` protocol to store and
   retrieve data. To access these objects using :command:`etcdctl`, you need to
   set the environment variable :envvar:`ETCDCTL_API` to `3`, e.g. using

   .. code-block:: shell

      export ETCDCTL_API=3

Refer to `the etcd documentation
<https://github.com/etcd-io/etcd/blob/master/Documentation/dev-guide/interacting_v3.md>`_
for more information about :command:`etcdctl` and how to interact with an
:program:`etcd` cluster.
