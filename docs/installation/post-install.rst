Post-Installation Procedure
===========================

.. _Provision Storage for Services:

Provision Storage for Services
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
After bootstrapping the cluster, the Prometheus and AlertManager services used
to monitor the system and the Loki service, used to aggregate the logs of the
platform, **will not be running** (the respective :term:`Pods
<Pod>` will remain in *Pending* state), because they require persistent storage
to be available.

You can either provision these storage volumes on the :term:`Bootstrap
node`, or later on other nodes joining the cluster. It is even recommended to
separate :ref:`Bootstrap services <node-role-bootstrap>` from :ref:`Infra
services <node-role-infra>`.

To create the required *Volume* objects, write a YAML file with the following
contents, replacing ``<node_name>`` with the name of the :term:`Node` on which
to run Prometheus, AlertManager and Loki, and ``<device_path[3]>`` with the
``/dev`` path for the partitions to use:

.. code-block:: yaml

   ---
   apiVersion: storage.metalk8s.scality.com/v1alpha1
   kind: Volume
   metadata:
     name: <node_name>-prometheus
   spec:
     nodeName: <node_name>
     storageClassName: metalk8s
     rawBlockDevice:  # Choose a device with at least 10GiB capacity
       devicePath: <device_path>
     template:
       metadata:
         labels:
           app.kubernetes.io/name: 'prometheus-operator-prometheus'
   ---
   apiVersion: storage.metalk8s.scality.com/v1alpha1
   kind: Volume
   metadata:
     name: <node_name>-alertmanager
   spec:
     nodeName: <node_name>
     storageClassName: metalk8s
     rawBlockDevice:  # Choose a device with at least 1GiB capacity
       devicePath: <device_path2>
     template:
       metadata:
         labels:
           app.kubernetes.io/name: 'prometheus-operator-alertmanager'
   ---
   apiVersion: storage.metalk8s.scality.com/v1alpha1
   kind: Volume
   metadata:
     name: <node_name>-loki
   spec:
     nodeName: <node_name>
     storageClassName: metalk8s
     rawBlockDevice:  # Choose a device with at least 10GiB capacity
       devicePath: <device_path3>
     template:
       metadata:
         labels:
           app.kubernetes.io/name: 'loki'

Once this file is created with the right values filled in, run the following
command to create the *Volume* objects (replacing ``<file_path>`` with the path
of the aforementioned YAML file):

.. code-block:: shell

   root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                      apply -f <file_path>

For more details on the available options for storage management, see
:doc:`this section of the Operational Guide
<../operation/volume_management/index>`.

.. todo::

   - Sanity check
   - Troubleshooting if needed

Loki volume sizing
""""""""""""""""""

Since the storage needs for logs greatly depends on the workload and the
type of application that run on top of the MetalK8s cluster, you need to
refer to the documentation provided by your applications to define the ideal
size for the volume.

We still provide some hints for the worst case, which is very unlikely.
If the entropy of log messages is high, which makes them almost
incompressible, you will need around **12Mb** per thousands of event per hour
for an average log line of **512 bytes**.

For **60000** events per hour, with the default retention of **2 weeks**:

``60 (1000 events) * 24 (hours per day) * 7 (days per week) * 3 (weeks) * 12 Mb
=~ 355 Gb``

This formula is given to calculate the worst case scenario, but with real
application logs, it should be drastically lower.

Regarding the MetalK8s cluster itself (internal services and system logs),
**1Gb** per week of retention should be sufficient in most cases.

.. warning::

   When you calculate the storage needs, you must always add an extra week to
   your actual retention, because of the current week of logs.

   Since there is no size-based purge mechanism, it is also recommended to add
   a security margin of +50% volume space, in case of log burst.

   Also, when creating the volume, you should take into account the potential
   growth of the cluster and workload.

Changing credentials
^^^^^^^^^^^^^^^^^^^^
After a fresh installation, an administrator account is created with default
credentials. For production deployments, make sure to change those credentials
and use safer values.

To change Grafana or MetalK8s GUI user credentials, follow :ref:`this procedure
<ops-grafana-admin>`.

Validating the deployment
^^^^^^^^^^^^^^^^^^^^^^^^^
To ensure the Kubernetes cluster is properly running before scheduling
applications, perform the following sanity checks:

#. Check that all desired Nodes are in a **Ready** state and show the expected
   :ref:`roles <node-roles>`:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         get nodes
      NAME         STATUS   ROLES                         AGE   VERSION
      bootstrap    Ready    bootstrap,etcd,infra,master   42m   v1.15.5
      node-1       Ready    etcd,infra,master             26m   v1.15.5
      node-2       Ready    etcd,infra,master             25m   v1.15.5

   Use the ``kubectl describe node <node_name>`` to get more details about a
   Node (for instance, to check the right :ref:`taints <node-taints>` are
   applied).

#. Check that :term:`Pods <Pod>` are in their expected state (most of the time,
   **Running**, except for Prometheus and AlertManager if the required storage
   was not provisioned yet - see :ref:`the procedure above <Provision
   Prometheus Storage>`).

   To look for all Pods at once, use the
   ``--all-namespaces`` flag. On the other hand, use the ``-n`` or
   ``--namespace`` option to select Pods in a given :term:`Namespace`.

   For instance, to check all Pods making up the cluster-critical services:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         get pods --namespace kube-system
      NAME                                       READY   STATUS    RESTARTS   AGE
      apiserver-proxy-bootstrap                  1/1     Running   0          43m
      apiserver-proxy-node-1                     1/1     Running   0          2m28s
      apiserver-proxy-node-2                     1/1     Running   0          9m
      calico-kube-controllers-6d8db9bcf5-w5w94   1/1     Running   0          43m
      calico-node-4vxpp                          1/1     Running   0          43m
      calico-node-hvlkx                          1/1     Running   7          23m
      calico-node-jhj4r                          1/1     Running   0          8m59s
      coredns-8576b4bf99-lfjfc                   1/1     Running   0          43m
      coredns-8576b4bf99-tnt6b                   1/1     Running   0          43m
      etcd-bootstrap                             1/1     Running   0          43m
      etcd-node-1                                1/1     Running   0          3m47s
      etcd-node-2                                1/1     Running   3          8m58s
      kube-apiserver-bootstrap                   1/1     Running   0          43m
      kube-apiserver-node-1                      1/1     Running   0          2m45s
      kube-apiserver-node-2                      1/1     Running   0          7m31s
      kube-controller-manager-bootstrap          1/1     Running   3          44m
      kube-controller-manager-node-1             1/1     Running   1          2m39s
      kube-controller-manager-node-2             1/1     Running   2          7m25s
      kube-proxy-gnxtp                           1/1     Running   0          28m
      kube-proxy-kvtjm                           1/1     Running   0          43m
      kube-proxy-vggzg                           1/1     Running   0          27m
      kube-scheduler-bootstrap                   1/1     Running   1          44m
      kube-scheduler-node-1                      1/1     Running   0          2m39s
      kube-scheduler-node-2                      1/1     Running   0          7m25s
      repositories-bootstrap                     1/1     Running   0          44m
      salt-master-bootstrap                      2/2     Running   0          44m
      storage-operator-756b87c78f-mjqc5          1/1     Running   1          43m

#. Using the result of the above command, obtain a shell in a running ``etcd``
   Pod (replacing ``<etcd_pod_name>`` with the appropriate value):

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         exec --namespace kube-system -it <etcd_pod_name> sh

   Once in this shell, use the following to obtain health information for the
   ``etcd`` cluster:

   .. code-block:: shell

      root@etcd-bootstrap $ etcdctl --endpoints=https://[127.0.0.1]:2379 \
                              --cacert=/etc/kubernetes/pki/etcd/ca.crt \
                              --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
                              --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
                              endpoint health --cluster

      https://<first-node-ip>:2379 is healthy: successfully committed proposal: took = 16.285672ms
      https://<second-node-ip>:2379 is healthy: successfully committed proposal: took = 43.462092ms
      https://<third-node-ip>:2379 is healthy: successfully committed proposal: took = 52.879358ms

#. Finally, check that the exposed services are accessible, using the
   information from :doc:`this document <./services>`.
