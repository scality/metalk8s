Deployment of the :term:`Bootstrap node`
========================================

Preparation
-----------

MetalK8s ISO
^^^^^^^^^^^^
On your bootstrap node, download the MetalK8s ISO file.
Mount this ISO file at the specific following path:

.. parsed-literal::

   root@bootstrap $ mkdir -p /srv/scality/metalk8s-|release|
   root@bootstrap $ mount <path-to-iso> /srv/scality/metalk8s-|release|


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
      products:
        metalk8s:
          - <path-to-extracted-directory-or-iso>

.. todo::

   - Explain the role of this config file and its values
   - Add a note about setting HA for ``apiServer``
   - Explain the ``products`` list


.. _quickstart-bootstrap-ssh:

SSH provisioning
^^^^^^^^^^^^^^^^
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

.. parsed-literal::

   root@bootstrap $ /srv/scality/metalk8s-|release|/bootstrap.sh

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

   root@bootstrap $ kubectl get nodes --kubeconfig /etc/kubernetes/admin.conf
   NAME                   STATUS    ROLES                         AGE       VERSION
   bootstrap              Ready     bootstrap,etcd,infra,master   17m       v1.11.7

   root@bootstrap $ kubectl get pods --all-namespaces -o wide --kubeconfig /etc/kubernetes/admin.conf
   NAMESPACE     NAME                                       READY     STATUS              RESTARTS   AGE       IP              NODE        NOMINATED NODE
   kube-system   calico-kube-controllers-79fdff95b4-ldrnc   1/1       Running             1          11m       10.233.132.86   bootstrap   <none>
   kube-system   calico-node-mhp89                          1/1       Running             1          11m       172.21.254.3    bootstrap   <none>
   kube-system   coredns-9f7df8996-8mq6p                    1/1       Running             1          13m       10.233.132.83   bootstrap   <none>
   kube-system   coredns-9f7df8996-zwwjp                    1/1       Running             1          13m       10.233.132.84   bootstrap   <none>
   kube-system   etcd-bootstrap                             1/1       Running             2          12m       172.21.254.3    bootstrap   <none>
   kube-system   kube-apiserver-bootstrap                   2/2       Running             2          14m       172.21.254.3    bootstrap   <none>
   kube-system   kube-controller-manager-bootstrap          1/1       Running             1          14m       172.21.254.3    bootstrap   <none>
   kube-system   kube-proxy-4dwzw                           1/1       Running             1          14m       172.21.254.3    bootstrap   <none>
   kube-system   kube-scheduler-bootstrap                   1/1       Running             1          14m       172.21.254.3    bootstrap   <none>
   kube-system   metalk8s-ui-89cb4d86b-xtbtp                1/1       Running             0          13m       10.233.132.82   bootstrap   <none>
   kube-system   repositories-bootstrap                     1/1       Running             1          14m       172.21.254.3    bootstrap   <none>
   kube-system   salt-master-bootstrap                      2/2       Running             2          14m       172.21.254.3    bootstrap   <none>
   monitoring    alertmanager-main-0                        2/2       Running             2          11m       10.233.132.81   bootstrap   <none>
   monitoring    alertmanager-main-1                        2/2       Running             2          11m       10.233.132.77   bootstrap   <none>
   monitoring    alertmanager-main-2                        2/2       Running             2          11m       10.233.132.78   bootstrap   <none>
   monitoring    grafana-6dc8899796-mdd7h                   1/1       Running             1          11m       10.233.132.88   bootstrap   <none>
   monitoring    kube-state-metrics-85648f5db9-sl25z        4/4       Running             4          11m       10.233.132.87   bootstrap   <none>
   monitoring    node-exporter-rdz8l                        2/2       Running             2          11m       172.21.254.3    bootstrap   <none>
   monitoring    prometheus-k8s-0                           3/3       Running             4          11m       10.233.132.79   bootstrap   <none>
   monitoring    prometheus-k8s-1                           3/3       Running             4          11m       10.233.132.80   bootstrap   <none>
   monitoring    prometheus-operator-7c9cc49c9-hqpg6        1/1       Running             1          11m       10.233.132.85   bootstrap   <none>

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
