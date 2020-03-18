Deploying the Bootstrap Node
============================

Standard deployment requires a :term:`bootstrap node` to deploy and populate
the other nodes. The bootstrap node is built using an ISO image.

Prepare
-------

Build or request a bootstrap ISO image. Licensed Scality customers can receive
validated builds from the Scality repositories. This is the easiest and best
way to get the ISO needed to deploy the bootstrap node.

To build an ISO, install the prerequisites described in the _`mandatory
requirements<../../developer/building/requirements.html#mandatory>` section of
the developer documentation. Docker must be installed and running.

#. Clone the MetalK8s repository::

   $ git clone https://github.com/scality/metalk8s.git

#. Open the top-level directory of the MetalK8s repository::

   $ cd metalk8s

#. Enter ``./doit.sh``.

   The doit script builds the ISO.

Whether you've built or received your ISO,

#. Download the MetalK8s ISO file to the machine that will host the bootstrap
   node.

   .. tip::

      It's fastest to download directly to the bootstrap node using wget or curl.

   ::

     $ wget https://packages.scality.com/moonshot/metalk8s/242/metalk8s.iso --user "<user.name>" --ask-password
     Password for user ‘user.name’:

     --2020-03-16 19:19:51--  https://packages.scality.com/moonshot/metalk8s/242/metalk8s.iso
     Resolving packages.scality.com (packages.scality.com)... 5.196.181.52
     Connecting to packages.scality.com (packages.scality.com)|5.196.181.52|:443... connected.
     HTTP request sent, awaiting response... 401 Unauthorized
     Reusing existing connection to packages.scality.com:443.
     HTTP request sent, awaiting response... 200 OK
     Length: 1445693440 (1.3G) [application/octet-stream]
     Saving to: ‘metalk8s.iso.1’

     100%[============================================================>] 1,445,693,440  212MB/s   in 7.1s

     2020-03-16 19:19:58 (193 MB/s) - ‘metalk8s.iso.1’ saved [1445693440/1445693440]

#. Assume root authority on the bootstrap node::

   $ sudo su

#. Mount the ISO file to the following path:

   .. parsed-literal::

      root@bootstrap # mkdir -p /srv/scality/metalk8s-|release|
      root@bootstrap # mount <path-to-iso> /srv/scality/metalk8s-|release|

.. _Bootstrap Configuration:

Configure
---------

Maintain root authority as you configure the bootstrap node.


#. Create the MetalK8s configuration directory.

   .. code-block:: shell

      root@bootstrap # mkdir /etc/metalk8s

#. Create the :file:`/etc/metalk8s/bootstrap.yaml` file. This file contains
   initial configuration settings that are required for setting up a MetalK8s
   :term:`Bootstrap node`. Change the networks, IP address, and hostname fields
   to conform to your infrastructure.

   .. code-block:: yaml

      apiVersion: metalk8s.scality.com/v1alpha2
      kind: BootstrapConfiguration
      networks:
        controlPlane: <CIDR-notation>
        workloadPlane: <CIDR-notation>
        pods: <CIDR-notation>
        services: <CIDR-notation>
      proxies:
        http: <http://proxy-ip:proxy-port>
        https: <https://proxy-ip:proxy-port>
        no_proxy:
          - <host>
          - <ip/cidr>
      ca:
        minion: <hostname-of-the-bootstrap-node>
      archives:
        - <path-to-metalk8s-iso>

   Fields that may require configuration are described below.

networks
^^^^^^^^

The ``networks`` field specifies a range of IP addresses written in CIDR
notation for its various subfields.


controlPlane and workloadPlane
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The ``controlPlane`` and ``workloadPlane`` entries, which specify the IP
address range used at the host level for each member of the cluster, are
mandatory.

   .. code-block:: yaml

     networks:
       controlPlane: 10.200.1.0/28
       workloadPlane: 10.200.1.0/28

All nodes in the cluster must connect to both the control plane and workload
plane networks. If both the control plane and workload plane networks use the
same network range, you can use the same interface.

pods and services
~~~~~~~~~~~~~~~~~

The ``pods`` and ``services`` fields are not mandatory, but can be changed to
match the constraints of existing networking infrastructure (for example, if
all or part of these default subnets is already routed). During installation,
``pods`` and ``services`` are set to the following default values if omitted.

For production clusters, you must anticipate future expansions and use
large enough networks for pods and services.

   .. code-block:: yaml

      networks:
        pods: 10.233.0.0/16
        services: 10.96.0.0/12

proxies
^^^^^^^

The ``proxies`` field can be omitted if there is no proxy to configure.

http/https
~~~~~~~~~~

The two entries ``http`` and ``https`` are used to configure the containerd
daemon proxy to fetch extra container images from outstide the MetalK8s
cluster.

no_proxy
~~~~~~~~

The ``no_proxy`` entry specifies IP addresses to be excluded from proxying.
This must consist of a list of hosts, IP addresses or IP ranges in CIDR format.
For example:

   .. code-block:: shell

      no_proxy:
        - localhost
        - 127.0.0.1
        - 10.10.0.0/16
        - 192.168.0.0/16

The ``archives`` field is a list of absolute paths to MetalK8s ISO files. When
the bootstrap script is executed, those ISOs are automatically mounted and the
system is configured to re-mount them automatically after a reboot.


.. _Bootstrap SSH Provisioning:

Provision SSH
-------------

#. Prepare the MetalK8s PKI directory.

   .. code-block:: shell

      root@bootstrap # mkdir -p /etc/metalk8s/pki

#. Generate a passwordless SSH key for authentication to the nodes you're about
   to create.

   .. code-block:: shell

      root@bootstrap # ssh-keygen -t rsa -b 4096 -N '' -f /etc/metalk8s/pki/salt-bootstrap

   The server responds with:

   .. code-block:: shell

     Generating public/private rsa key pair.
     Your identification has been saved in /etc/metalk8s/pki/salt-bootstrap.
     Your public key has been saved in /etc/metalk8s/pki/salt-bootstrap.pub.
     The key fingerprint is:
     SHA256:b/c5KYswnE9p7p66tI5EcJGAgtx8Mc/SCKLgu7WFcew root@bootstrap.novalocal
     The key's randomart image is:
     +---[RSA 4096]----+
     |+o+o.+.          |
     |B..o+o*          |
     |o...o= +         |
     |  .o= .          |
     | . o.E  S        |
     |  o.o  . o .=    |
     | . .. . = * .  . |
     |   . o o X o..o. |
     |    ..=+= o  oo. |
     +----[SHA256]-----+

   .. warning::

      This key must reside in the /etc/metalk8s/pki directory. You don't have to
      name it "salt-bootstrap", but if you name it something else, you will need
      to substitute that name in the commands that follow.

#. Accept the new identity for the new nodes. From your host:

   a. Make sure each node is accessible from the host using ssh. For each node,
      enter:

      .. code-block:: shell

         user@host $ ssh <nodename or IP address>

         The authenticity of host '<nodename> (10.200.5.150)' can't be established.
         ECDSA key fingerprint is SHA256:lXF4HvkU4lPS7Wc8MJgygi4cet5FHTN+SSpk0lq6in8.
         Are you sure you want to continue connecting (yes/no)? yes
         Warning: Permanently added '<nodename>' (ECDSA) to the list of known hosts.

      If you've already accessed all the nodes with SSH, you can skip this step.

   #. Retrieve the public key from the bootstrap node:

      .. code-block:: shell

         user@host $ scp root@bootstrap:/etc/metalk8s/pki/salt-bootstrap.pub /tmp/salt-bootstrap.pub

         salt-bootstrap.pub                                            100%  750     3.6KB/s   00:00

   #. Authorize this public key on each new node.

      .. code-block:: shell

         user@host $ ssh-copy-id -i -f /tmp/salt-bootstrap.pub root@<node_hostname>

      Repeat until all nodes accept SSH connections from the Bootstrap node.

.. _Bootstrap installation:

Install
-------

Run the Installation
^^^^^^^^^^^^^^^^^^^^

Run the bootstrap script to install binaries and services required on the
Bootstrap node.

.. parsed-literal::

   root@bootstrap # /srv/scality/metalk8s-|release|/bootstrap.sh

   .. warning::

    For virtual networks (or any network which enforces source and
    destination fields of IP packets to correspond to the MAC address(es)),
    :ref:`IP-in-IP needs to be enabled<enable IP-in-IP>`.

Configure kubectl Administration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To administer the Kubernetes cluster you must issue kubectl commands. kubectl
requires a defined path and credentials. Running the bootstrap installation
script generates a file, admin.conf, which contains address, port, and
credential information required for access.

.. note::

   This file contains sensitive information and must be kept secure.

You can reference this file explicitly in commands using the ``--kubeconfig``
argument. For example::

   root@bootstrap # get pods --all-namespaces --kubeconfig /etc/kubernetes/admin.conf

It is easier, however, to export this path to an environment variable. From the
bootstrap node, enter::

   root@bootstrap # export KUBECONFIG=/etc/kubernetes/admin.conf

With this path exported, the root user on the bootstrap node can issue kubectl
commands without nominating the kubectl path on each command.

In a non-production environment, you can copy admin.conf to your local host
machine and establish a kubectl session by copying admin.conf to a local
directory, exporting KUBECONFIG to that location as shown above, and opening a
local kubectl session with::

   user@host $ kubectl proxy

While this proxy is in session, the user can issue kubectl commands from a
second terminal on the host.

.. warning::

   This configuration is not secure and is suitable *only* for ease of use in
   test and familiarization deployments. *Do not deploy it in a production
   environment.*

Validate the Installation
^^^^^^^^^^^^^^^^^^^^^^^^^

From your kubectl-enabled machine:

- Check that all :term:`Pods <Pod>` on the bootstrap node are in the
  ``Running`` state::

    root@bootstrap # kubectl get pods --all-namespaces

  MetalK8s responds as follows. Prometheus and Alertmanager pods remain in a
  ``Pending`` state until their persistent storage volumes are provisioned as
  described in the :ref:`Post-Installation Proedure<Provision Prometheus storage>`.

  .. code-block::

     NAMESPACE             NAME                                                      READY   STATUS    RESTARTS   AGE
     kube-system           apiserver-proxy-bootstrap.novalocal                       1/1     Running   1          17m
     kube-system           calico-kube-controllers-6d4f8d6565-7ms4w                  1/1     Running   1          17m
     kube-system           calico-node-tj9mb                                         1/1     Running   1          17m
     kube-system           coredns-776b9d4f7-t6l56                                   1/1     Running   1          17m
     kube-system           coredns-776b9d4f7-zh5b9                                   1/1     Running   1          17m
     kube-system           etcd-bootstrap.novalocal                                  1/1     Running   1          18mm
     kube-system           kube-apiserver-bootstrap.novalocal                        1/1     Running   1          17m
     kube-system           kube-controller-manager-bootstrap.novalocal               1/1     Running   1          18mm
     kube-system           kube-proxy-vdz4w                                          1/1     Running   1          17m
     kube-system           kube-scheduler-bootstrap.novalocal                        1/1     Running   1          18mm
     kube-system           repositories-bootstrap.novalocal                          1/1     Running   1          18mm
     kube-system           salt-master-bootstrap.novalocal                           2/2     Running   2          18mm
     kube-system           storage-operator-7db4756cc9-ptgqh                         1/1     Running   1          17m
     metalk8s-ingress      nginx-ingress-control-plane-controller-hzwmm              1/1     Running   1          17m
     metalk8s-ingress      nginx-ingress-controller-bhk2w                            1/1     Running   1          17m
     metalk8s-ingress      nginx-ingress-default-backend-585c66c874-qjh9d            1/1     Running   1          17m
     metalk8s-monitoring   alertmanager-prometheus-operator-alertmanager-0           0/2     Pending   0          17m
     metalk8s-monitoring   prometheus-adapter-545b44c584-d4mbx                       1/1     Running   1          17m
     metalk8s-monitoring   prometheus-operator-grafana-688649c67b-v5k5p              2/2     Running   2          17m
     metalk8s-monitoring   prometheus-operator-kube-state-metrics-7c8f746b9d-dblnr   1/1     Running   1          17m
     metalk8s-monitoring   prometheus-operator-operator-7f469cbbf-nlgxn              1/1     Running   1          17m
     metalk8s-monitoring   prometheus-operator-prometheus-node-exporter-bprmv        1/1     Running   1          17m
     metalk8s-monitoring   prometheus-prometheus-operator-prometheus-0               0/3     Pending   0          16m
     metalk8s-ui           metalk8s-ui-57946664ff-r5rcs                              1/1     Running   1          17m

- Review the bootstrap node's status with ``kubectl get nodes``.

  .. code-block:: shell

     root@bootstrap $ kubectl get nodes
     NAME                   STATUS    ROLES                         AGE       VERSION
     bootstrap              Ready     bootstrap,etcd,infra,master   17m       v1.15.5


If you encouter an error during installation or have difficulties validating a
fresh MetalK8s installation, visit our :ref:`Troubleshooting Guide
<Troubleshooting Guide>`.
