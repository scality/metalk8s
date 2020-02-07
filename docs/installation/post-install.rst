Post-Installation Procedure
===========================

.. _Provision Prometheus Storage:

Provision Storage for Prometheus Services
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
After bootstrapping the cluster, the Prometheus and AlertManager services used
to monitor the system **will not be running** (the respective :term:`Pods
<Pod>` will remain in *Pending* state), because they require persistent storage
to be available.

You can either provision these storage volumes on the :term:`Bootstrap
node`, or later on other nodes joining the cluster. It is even recommended to
separate :ref:`Bootstrap services <node-role-bootstrap>` from :ref:`Infra
services <node-role-infra>`.

To create the required *Volume* objects, write a YAML file with the following
contents, replacing ``<node_name>`` with the name of the :term:`Node` on which
to run Prometheus and AlertManager, and ``<device_path[2]>`` with the ``/dev``
path for the partitions to use:

.. code-block:: yaml

   ---
   apiVersion: storage.metalk8s.scality.com/v1alpha1
   kind: Volume
   metadata:
     name: <node_name>-prometheus
   spec:
     nodeName: <node_name>
     storageClassName: metalk8s-prometheus
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
     storageClassName: metalk8s-prometheus
     rawBlockDevice:  # Choose a device with at least 1GiB capacity
       devicePath: <device_path2>
     template:
       metadata:
         labels:
           app.kubernetes.io/name: 'prometheus-operator-alertmanager'
   ---

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


Changing credentials
^^^^^^^^^^^^^^^^^^^^
After a fresh installation, an administrator account is created with default
credentials. For production deployments, make sure to change those credentials
and use safer values.

To change user credentials and groups for :term:`K8s API <API Server>` (and as
such, for :ref:`MetalK8s GUI <installation-services-admin-ui>` and
:term:`SaltAPI`), follow :ref:`this procedure <ops-k8s-admin>`.

To change Grafana user credentials, follow :ref:`this procedure
<ops-grafana-admin>`.

