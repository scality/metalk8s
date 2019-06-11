Deployment of the :term:`Bootstrap node`
========================================

Preparation
-----------

MetalK8s ISO
^^^^^^^^^^^^
On your bootstrap node, download the MetalK8s ISO file.
Mount this ISO file at the specific following path:

.. code-block:: shell

   root@bootstrap $ mkdir -p /srv/scality/metalk8s-|version|
   root@bootstrap $ mount <path-to-iso> /srv/scality/metalk8s-|version|


.. _quickstart-bootstrap-config:

Configuration
-------------

#. Create the MetalK8s configuration directory.

   .. code-block:: shell

      root@bootstrap $ mkdir /etc/metalk8s

#. Create the :file:`/etc/metalk8s/bootstrap.yaml` file. Change the networks,
   IP address, and hostname to conform to your infrastructure.

   .. code-block:: yaml

      apiVersion: metalk8s.scality.com/v1alpha2
      kind: BootstrapConfiguration
      networks:
        controlPlane: <CIDR-notation>
        workloadPlane: <CIDR-notation>
      ca:
        minion: <hostname-of-the-bootstrap-node>
      apiServer:
        host: <IP-of-the-bootstrap-node>

.. todo::

   - Explain the role of this config file and its values
   - Add a note about setting HA for ``apiServer``


.. _quickstart-bootstrap-ssh:

SSH identity
^^^^^^^^^^^^
#. Prepare the MetalK8s PKI directory.

   .. code-block:: shell

      root@bootstrap $ mkdir -p /etc/metalk8s/pki

#. Generate a passwordless SSH key that will be used for authentication
   to future new nodes.

   .. code-block:: shell

      root@bootstrap $ ssh-keygen -t rsa -b 4096 -N '' -f /etc/metalk8s/pki/salt-bootstrap

   .. warning::

      Although the key name is not critical (will be re-used afterwards, so
      make sure to replace occurences of ``salt-bootstrap`` where relevant),
      this key must exist in the ``/etc/metalk8s/pki`` directory.

#. Accept the new identity on future new nodes (run from your host).
   First, retrieve the public key from the Bootstrap node.

   .. code-block:: shell

      user@host $ scp root@bootstrap:/etc/metalk8s/pki/salt-bootstrap.pub /tmp/salt-bootstrap.pub

   Then, authorize this public key on each new node (this command assumes a
   functional SSH access from your host to the target node). Repeat until all
   nodes accept SSH connections from the Bootstrap node.

   .. code-block:: shell

      user@host $ ssh-copy-id -i /tmp/salt-bootstrap.pub root@<node_hostname>


Installation
------------

Run the install
^^^^^^^^^^^^^^^
Run the bootstrap script to install binaries and services required on the
Bootstrap node.

.. code-block:: shell

   root@bootstrap $ /srv/scality/metalk8s-2.0/bootstrap.sh

Validate the install
^^^^^^^^^^^^^^^^^^^^
Check if all :term:`Pods <Pod>` on the Bootstrap node are in the
``Running`` state.

.. note::

   On all subsequent :term:`kubectl` commands, you may omit the
   ``--kubeconfig`` argument if you have exported the ``KUBECONFIG``
   environment variable set to the path of the administrator :term:`kubeconfig`
   file for the cluster.

   By default, this path is ``/etc/kubernetes/admin.conf``.

   .. code-block:: shell

      root@bootstrap $ export KUBECONFIG=/etc/kubernetes/admin.conf

.. code-block:: shell

   root@bootstrap $ kubectl get node --kubeconfig /etc/kubernetes/admin.conf
   NAME                   STATUS    ROLES                         AGE       VERSION
   bootstrap              Ready     bootstrap,etcd,infra,master   17m       v1.11.7

   root@bootstrap $ kubectl get pods --all-namespaces -o wide --kubeconfig /etc/kubernetes/admin.conf
   NAMESPACE     NAME                                          READY     STATUS    RESTARTS   AGE       IP             NODE                  NOMINATED NODE
   kube-system   calico-node-zw74v                             1/1       Running   0          18m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   coredns-6b9cb79bf4-jbtxc                      1/1       Running   0          18m       10.233.0.2     bootstrap.novalocal   <none>
   kube-system   coredns-6b9cb79bf4-tdmz8                      1/1       Running   0          18m       10.233.0.4     bootstrap.novalocal   <none>
   kube-system   etcd-bootstrap                                1/1       Running   0          17m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   kube-apiserver-bootstrap                      1/1       Running   0          17m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   kube-controller-manager-bootstrap             1/1       Running   0          17m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   kube-proxy-mwxhf                              1/1       Running   0          18m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   kube-scheduler-bootstrap                      1/1       Running   0          17m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   metalk8s-ui-656f6857b-cdt5p                   1/1       Running   0          18m       10.233.0.3     bootstrap.novalocal   <none>
   kube-system   package-repositories-bootstrap                1/1       Running   0          17m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   registry-bootstrap                            1/1       Running   0          17m       172.21.254.7   bootstrap.novalocal   <none>
   kube-system   salt-master-bootstrap                         2/2       Running   0          17m       172.21.254.7   bootstrap.novalocal   <none>

Check that you can access the MetalK8s GUI, following
:ref:`this procedure <quickstart-services-admin-ui>`.

Troubleshooting
^^^^^^^^^^^^^^^

.. todo::

   - Mention ``/var/log/metalk8s-bootstrap.log`` and the command-line options
     for verbosity.
   - Add Salt master/minion logs, and explain how to run a specific state from
     the Salt master.
   - Then refer to a troubleshooting section in the installation guide.
