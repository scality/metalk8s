Deployment of the :term:`Bootstrap node`
========================================

Preparation
-----------

#. Retrieve a MetalK8s ISO (you may build one yourself by following our
   developer guide).
   Scality customers can retrieve validated builds as part of their license
   from the Scality repositories.

#. Download the MetalK8s ISO file on the machine that will host the bootstrap
   node. Run `checkisomd5 --verbose <path-to-iso>` to validate its integrity
   (`checkisomd5` is part of the `isomd5sum` package).

#. Mount this ISO file at the path of your choice (we will use
   ``/srv/scality/metalk8s-|version|`` for the rest of this guide, as this is
   where the ISO will be mounted automatically after running the bootstrap
   script):

   .. parsed-literal::

      root@bootstrap $ mkdir -p /srv/scality/metalk8s-|version|
      root@bootstrap $ mount <path-to-iso> /srv/scality/metalk8s-|version|

.. _Bootstrap Configuration:

Configuration
-------------

#. Create the MetalK8s configuration directory.

   .. code-block:: shell

      root@bootstrap $ mkdir /etc/metalk8s

#. Create the :file:`/etc/metalk8s/bootstrap.yaml` file.
   This file contains initial configuration settings which are mandatory for
   setting up a MetalK8s :term:`Bootstrap node`.
   Change the networks, IP address, and hostname fields to conform to your
   infrastructure.

   .. code-block:: yaml

      apiVersion: metalk8s.scality.com/v1alpha3
      kind: BootstrapConfiguration
      networks:
        controlPlane:
          cidr: <CIDR-notation>
        workloadPlane:
          cidr: <CIDR-notation>
          mtu: <network-MTU>
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

The ``networks`` field specifies a range of IP addresses written in CIDR
notation for it's various subfields.

      The ``controlPlane`` and ``workloadPlane`` entries are **mandatory**.
      These values specify the range of IP addresses that will be used at the
      host level for each member of the cluster.

      .. note::

        Several CIDRs can be provided if all nodes do not sit in the same
        network. This is an :ref:`advanced configuration<multiple CIDR network>`
        which we do not recommend for non-experts.

      For ``workloadPlane`` entry an
      `MTU <https://en.wikipedia.org/wiki/Maximum_transmission_unit>`_ can
      also be provided, this MTU value should be the lowest MTU value accross
      all the workload plane network. The default value for this MTU is 1460.

      .. code-block:: yaml

            networks:
              controlPlane:
                cidr: 10.200.1.0/28
              workloadPlane:
                cidr: 10.200.1.0/28
                mtu: 1500

      All nodes within the cluster **must** connect to both the control plane
      and workload plane networks. If the same network range is chosen for both
      the control plane and workload plane networks then the same interface
      may be used.

      The ``pods`` and ``services`` fields are not mandatory, though can be
      changed to match the constraints of existing networking infrastructure
      (for example, if all or part of these default subnets is already routed).
      During installation, by default ``pods`` and ``services`` are set to the
      following values below if omitted.

      For **production clusters**, we advise users to anticipate future
      expansions and use sufficiently large networks for pods and services.

      .. code-block:: yaml

            networks:
              pods: 10.233.0.0/16
              services: 10.96.0.0/12

The ``proxies`` field can be omitted if there is no proxy to configure.
The 2 entries ``http`` and ``https`` are used to configure the containerd
daemon proxy to fetch extra container images from outstide the MetalK8s
cluster.
The ``no_proxy`` entry specifies IPs that should be excluded from proxying,
it must be a list of hosts, IP addresses or IP ranges in CIDR format.
For example;

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

SSH Provisioning
----------------

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

   #. Retrieve the public key from the Bootstrap node.

      .. code-block:: shell

         user@host $ scp root@bootstrap:/etc/metalk8s/pki/salt-bootstrap.pub /tmp/salt-bootstrap.pub

   #. Authorize this public key on each new node (this command assumes a
      functional SSH access from your host to the target node). Repeat until all
      nodes accept SSH connections from the Bootstrap node.

      .. code-block:: shell

         user@host $ ssh-copy-id -i /tmp/salt-bootstrap.pub root@<node_hostname>


.. _Bootstrap installation:

Installation
------------

Run the Installation
^^^^^^^^^^^^^^^^^^^^
Run the bootstrap script to install binaries and services required on the
Bootstrap node.

.. parsed-literal::

   root@bootstrap $ /srv/scality/metalk8s-|version|/bootstrap.sh

.. warning::

    For virtual networks (or any network which enforces source and
    destination fields of IP packets to correspond to the MAC address(es)),
    :ref:`IP-in-IP needs to be enabled<enable IP-in-IP>`.

Validate the install
^^^^^^^^^^^^^^^^^^^^
- Check that all :term:`Pods <Pod>` on the Bootstrap node are in the
  **Running** state. Note that Prometheus and Alertmanager pods will remain in
  a **Pending** state until their respective persistent storage volumes are
  provisioned.

.. note::

   The administrator :term:`Kubeconfig` file is used to configure access to
   Kubernetes when used with :term:`kubectl` as shown below. This file contains
   sensitive information and should be kept securely.

   On all subsequent :term:`kubectl` commands, you may omit the
   ``--kubeconfig`` argument if you have exported the ``KUBECONFIG``
   environment variable set to the path of the administrator :term:`Kubeconfig`
   file for the cluster.

   By default, this path is ``/etc/kubernetes/admin.conf``.

   .. code-block:: shell

      root@bootstrap $ export KUBECONFIG=/etc/kubernetes/admin.conf

.. code-block:: shell

   root@bootstrap $ kubectl get nodes --kubeconfig /etc/kubernetes/admin.conf
   NAME                   STATUS    ROLES                         AGE       VERSION
   bootstrap              Ready     bootstrap,etcd,infra,master   17m       v1.15.5

   root@bootstrap $ kubectl get pods --all-namespaces -o wide --kubeconfig /etc/kubernetes/admin.conf
   NAMESPACE             NAME                                                      READY   STATUS    RESTARTS   AGE     IP               NODE            NOMINATED NODE   READINESS GATES
   kube-system           calico-kube-controllers-7c9944c5f4-h9bsc                  1/1     Running   0          6m29s   10.233.220.129   bootstrap   <none>           <none>
   kube-system           calico-node-v4qhb                                         1/1     Running   0          6m29s   10.200.3.152     bootstrap   <none>           <none>
   kube-system           coredns-ff46db798-k54z9                                   1/1     Running   0          6m29s   10.233.220.134   bootstrap   <none>           <none>
   kube-system           coredns-ff46db798-nvmjl                                   1/1     Running   0          6m29s   10.233.220.132   bootstrap   <none>           <none>
   kube-system           etcd-bootstrap                                            1/1     Running   0          5m45s   10.200.3.152     bootstrap   <none>           <none>
   kube-system           kube-apiserver-bootstrap                                  1/1     Running   0          5m57s   10.200.3.152     bootstrap   <none>           <none>
   kube-system           kube-controller-manager-bootstrap                         1/1     Running   0          7m4s    10.200.3.152     bootstrap   <none>           <none>
   kube-system           kube-proxy-n6zgk                                          1/1     Running   0          6m32s   10.200.3.152     bootstrap   <none>           <none>
   kube-system           kube-scheduler-bootstrap                                  1/1     Running   0          7m4s    10.200.3.152     bootstrap   <none>           <none>
   kube-system           repositories-bootstrap                                    1/1     Running   0          6m20s   10.200.3.152     bootstrap   <none>           <none>
   kube-system           salt-master-bootstrap                                     2/2     Running   0          6m10s   10.200.3.152     bootstrap   <none>           <none>
   kube-system           storage-operator-7567748b6d-hp7gq                         1/1     Running   0          6m6s    10.233.220.138   bootstrap   <none>           <none>
   metalk8s-ingress      nginx-ingress-control-plane-controller-5nkkx              1/1     Running   0          6m6s    10.233.220.137   bootstrap   <none>           <none>
   metalk8s-ingress      nginx-ingress-controller-shg7x                            1/1     Running   0          6m7s    10.233.220.135   bootstrap   <none>           <none>
   metalk8s-ingress      nginx-ingress-default-backend-7d8898655c-jj7l6            1/1     Running   0          6m7s    10.233.220.136   bootstrap   <none>           <none>
   metalk8s-logging      loki-0                                                    0/1     Pending   0          6m21s    <none>           <none>      <none>           <none>
   metalk8s-monitoring   alertmanager-prometheus-operator-alertmanager-0           0/2     Pending   0          6m1s    <none>           <none>      <none>           <none>
   metalk8s-monitoring   prometheus-operator-grafana-775fbb5b-sgngh                2/2     Running   0          6m17s   10.233.220.130   bootstrap   <none>           <none>
   metalk8s-monitoring   prometheus-operator-kube-state-metrics-7587b4897c-tt79q   1/1     Running   0          6m17s   10.233.220.131   bootstrap   <none>           <none>
   metalk8s-monitoring   prometheus-operator-operator-7446d89644-zqdlj             1/1     Running   0          6m17s   10.233.220.133   bootstrap   <none>           <none>
   metalk8s-monitoring   prometheus-operator-prometheus-node-exporter-rb969        1/1     Running   0          6m17s   10.200.3.152     bootstrap   <none>           <none>
   metalk8s-monitoring   prometheus-prometheus-operator-prometheus-0               0/3     Pending   0          5m50s   <none>           <none>      <none>           <none>
   metalk8s-ui           metalk8s-ui-6f74ff4bc-fgk86                               1/1     Running   0          6m4s    10.233.220.139   bootstrap   <none>           <none>

- From the console output above, :term:`Prometheus`, :term:`Alertmanager` and
  :term:`Loki` pods are in a ``Pending`` state because their respective
  persistent storage volumes need to be provisioned. To provision these
  persistent storage volumes, follow
  :ref:`this procedure <Provision Storage for Services>`.

- Check that you can access the MetalK8s GUI after the
  :ref:`installation <Bootstrap installation>` is completed by following
  :ref:`this procedure <installation-services-admin-ui>`.

- At this stage, the MetalK8s GUI should be up and ready for you to
  explore.

  .. note::

     Monitoring through the MetalK8s GUI will not be available until persistent
     storage volumes for both Prometheus and Alertmanager have been successfully
     provisioned.

- If you encouter an error during installation or have issues
  validating a fresh MetalK8s installation, refer to the
  :ref:`Troubleshooting guide <Troubleshooting Installation Guide>`.
