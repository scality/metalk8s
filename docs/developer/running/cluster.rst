Running a cluster locally
=========================

Requirements
------------

- the :ref:`mandatory requirements for the buildchain<build-required-deps>`
- `Vagrant <https://www.vagrantup.com/>`_, 1.8 or higher: to spawn a local
  cluster (VirtualBox is currently the only provider supported)
- `VirtualBox <https://www.virtualbox.org>`_: to spawn a local cluster

Procedure
---------

You can spawn a local MetalK8s cluster by running ``./doit.sh vagrant_up``.

This command will start a virtual machine (using VirtualBox) and:

- mount the build tree
- import a private SSH key (automatically generated in ``.vagrant``)
- generate a boostrap configuration
- execute the bootstrap script to make this machine a bootstrap node
- provision sparse-file Volumes for Prometheus and Alertmanager to run on this
  bootstrap node

After executing this command, you have a MetalK8s bootstrap node up and running
and you can connect to it by using ``vagrant ssh bootstrap``.

Note that you can extend your cluster by spawning extra nodes (up to 9 are
already pre-defined in the provided ``Vagrantfile``) by running
``vagrant up node1 --provision``.
This will:

- spawn a virtual machine for the node 1
- import the pre-shared SSH key into it

You can then follow the cluster expansion procedure to add the freshly spawned
node into your MetalK8s cluster (you can get the node's IP with
``vagrant ssh node1 -- sudo ip a show eth1``).
