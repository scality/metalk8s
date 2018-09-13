.. spelling::

   Quickstart
   subdirectory
   Todo
   usernames

Quickstart Guide
================
To quickly set up a testing cluster using MetalK8s_, you need three machines
running CentOS_ 7.4 to which you have SSH access (these can be VMs). Each
machine acting as a Kubernetes_ node (all of them, in this example) also
need to have at least one disk available to provision storage volumes.

.. todo:: Give some sizing examples

.. _MetalK8s: https://github.com/scality/metal-k8s/
.. _CentOS: https://www.centos.org
.. _Kubernetes: https://kubernetes.io

Defining an Inventory
---------------------
To tell the Ansible_-based deployment system on which machines MetalK8s should
be installed, a so-called *inventory* needs to be provided. This inventory
contains a file listing all the hosts comprising the cluster, as well as some
configuration.

.. _Ansible: https://www.ansible.com

Create a directory to store the inventory, e.g. :file:`inventory/quickstart-cluster`.
For our setup, we need to create two files. One listing all the hosts, aptly called :file:`hosts`:

.. code-block:: ini

    node-01 ansible_host=10.0.0.1 ansible_user=centos
    node-02 ansible_host=10.0.0.2 ansible_user=centos
    node-03 ansible_host=10.0.0.3 ansible_user=centos

    [kube-master]
    node-01
    node-02
    node-03

    [etcd]
    node-01
    node-02
    node-03

    [kube-node]
    node-01
    node-02
    node-03

    [k8s-cluster:children]
    kube-node
    kube-master

Make sure to change IP-addresses, usernames etc. according to your
infrastructure.

In a second file, called :file:`kube-node.yml` in a :file:`group_vars`
subdirectory of our inventory, we declare how to setup storage (in the
default configuration) on hosts in the *kube-node* group, i.e. hosts on which
Pods will be scheduled:

.. code-block:: yaml

    metalk8s_lvm_drives_vg_metalk8s: ['/dev/vdb']

In the above, we assume every *kube-node* host has a disk available as
:file:`/dev/vdb` which can be used to set up Kubernetes *PersistentVolumes*. For
more information about storage, see :doc:`../architecture/storage`.

.. _upgrade_from_MetalK8s_before_0.2.0:

Upgrading from MetalK8s < 0.2.0
-------------------------------
MetalK8s 0.2.0 introduced changes to persistent storage provisioning which are
not backwards-compatible with MetalK8s 0.1. These changes include:

- The default LVM VG was renamed from `kubevg` to `vg_metalk8s`.
- Only *PersistentVolumes* required by MetalK8s services are created by
  default.
- Instead of using dictionaries to configure the storage, these are now
  flattened.

When a MetalK8s 0.1 configuration is detected, the playbook will report an
error.

Given an old configuration looking like this

.. code-block:: yaml

    metal_k8s_lvm:
      vgs:
        kubevg:
          drives: ['/dev/vdb']

the following values must be set in :file:`kube-node.yml` to maintain the
pre-0.2 behaviour:

- Disable deployment of 'default' volumes:

  .. code-block:: yaml

      metalk8s_lvm_default_vg: False

- Register the `kubevg` VG to be managed:

  .. code-block:: yaml

      metalk8s_lvm_vgs: ['kubevg']

- Use :file:`/dev/vdb` as a volume for the `kubevg` VG:

  .. code-block:: yaml

      metalk8s_lvm_drives_kubevg: ['/dev/vdb']

  Note how the VG name is appended to the `metalk8s_lvm_drives_` prefix to
  configure a VG-specific setting.

- Create and register the default MetalK8s 0.1 LVs and *PersistentVolumes*:

  .. code-block:: yaml

      metalk8s_lvm_lvs_kubevg:
        lv01:
          size: 52G
        lv02:
          size: 52G
        lv03:
          size: 52G
        lv04:
          size: 11G
        lv05:
          size: 11G
        lv06:
          size: 11G
        lv07:
          size: 5G
        lv08:
          size: 5G

Entering the MetalK8s Shell
---------------------------
To easily install a supported version of Ansible and its dependencies, as well
as some Kubernetes tools (:program:`kubectl` and :program:`helm`), we provide a
:program:`make` target which installs these in a local environment. To enter
this environment, run :command:`make shell` (this takes a couple of seconds on
first run)::

    $ make shell
    Creating virtualenv...
    Installing Python dependencies...
    Downloading kubectl...
    Downloading Helm...
    Launching MetalK8s shell environment. Run 'exit' to quit.
    (metal-k8s) $

Now we're all set to deploy a cluster::

    (metal-k8s) $ ansible-playbook -i inventory/quickstart-cluster -b playbooks/deploy.yml

Grab a coffee and wait for deployment to end.

Inspecting the cluster
----------------------
Once deployment finished, a file containing credentials to access the cluster
is created: :file:`inventory/quickstart-cluster/artifacts/admin.conf`. We can
export this location in the shell such that the :program:`kubectl` and
:program:`helm` tools know how to contact the cluster *kube-master* nodes, and
authenticate properly::

    (metal-k8s) $ export KUBECONFIG=`pwd`/inventory/quickstart-cluster/artifacts/admin.conf

Now, assuming port *6443* on the first *kube-master* node is reachable from
your system, we can e.g. list the nodes::

    (metal-k8s) $ kubectl get nodes
    NAME        STATUS    ROLES            AGE       VERSION
    node-01     Ready     master,node      1m        v1.9.5+coreos.0
    node-02     Ready     master,node      1m        v1.9.5+coreos.0
    node-03     Ready     master,node      1m        v1.9.5+coreos.0

or list all pods::

    (metal-k8s) $ kubectl get pods --all-namespaces
    NAMESPACE      NAME                                                   READY     STATUS      RESTARTS   AGE
    kube-ingress   nginx-ingress-controller-9d8jh                         1/1       Running     0          1m
    kube-ingress   nginx-ingress-controller-d7vvg                         1/1       Running     0          1m
    kube-ingress   nginx-ingress-controller-m8jpq                         1/1       Running     0          1m
    kube-ingress   nginx-ingress-default-backend-6664bc64c9-xsws5         1/1       Running     0          1m
    kube-ops       alertmanager-kube-prometheus-0                         2/2       Running     0          2m
    kube-ops       alertmanager-kube-prometheus-1                         2/2       Running     0          2m
    kube-ops       es-client-7cf569f5d8-2z974                             1/1       Running     0          2m
    kube-ops       es-client-7cf569f5d8-qq4h2                             1/1       Running     0          2m
    kube-ops       es-data-cd5446fff-pkmhn                                1/1       Running     0          2m
    kube-ops       es-data-cd5446fff-zzd2h                                1/1       Running     0          2m
    kube-ops       es-exporter-elasticsearch-exporter-7df5bcf58b-k9fdd    1/1       Running     3          1m
    ...

Similarly, we can list all deployed Helm_ applications::

    (metal-k8s) $ helm list
    NAME                    REVISION        UPDATED                         STATUS          CHART                           NAMESPACE
    es-exporter             3               Wed Apr 25 23:10:13 2018        DEPLOYED        elasticsearch-exporter-0.1.2    kube-ops
    fluentd                 3               Wed Apr 25 23:09:59 2018        DEPLOYED        fluentd-elasticsearch-0.1.4     kube-ops
    heapster                3               Wed Apr 25 23:09:37 2018        DEPLOYED        heapster-0.2.7                  kube-system
    kibana                  3               Wed Apr 25 23:10:06 2018        DEPLOYED        kibana-0.2.2                    kube-ops
    kube-prometheus         3               Wed Apr 25 23:09:22 2018        DEPLOYED        kube-prometheus-0.0.33          kube-ops
    nginx-ingress           3               Wed Apr 25 23:09:09 2018        DEPLOYED        nginx-ingress-0.11.1            kube-ingress
    prometheus-operator     3               Wed Apr 25 23:09:14 2018        DEPLOYED        prometheus-operator-0.0.15      kube-ops

.. _Helm: https://www.helm.sh

Cluster Services
----------------
Various services to operate and monitor your MetalK8s cluster are provided. To
access these, first create a secure tunnel into your cluster by running
``kubectl proxy``. Then, while the tunnel is up and running, the following
tools are available:

+-------------------------+---------------------------------------------------------+-------------------------------------------------------------------------------------------------+
| Service                 | Role                                                    | Link                                                                                            |
+=========================+=========================================================+=================================================================================================+
| `Kubernetes dashboard`_ | A general purpose, web-based UI for Kubernetes clusters | http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/ |
+-------------------------+---------------------------------------------------------+-------------------------------------------------------------------------------------------------+
| `Grafana`_              | Monitoring dashboards for cluster services              | http://localhost:8001/api/v1/namespaces/kube-ops/services/kube-prometheus-grafana:http/proxy/   |
+-------------------------+---------------------------------------------------------+-------------------------------------------------------------------------------------------------+
| `Cerebro`_              | An administration and monitoring console for            | http://localhost:8001/api/v1/namespaces/kube-ops/services/cerebro:http/proxy/                   |
|                         | Elasticsearch clusters                                  |                                                                                                 |
+-------------------------+---------------------------------------------------------+-------------------------------------------------------------------------------------------------+
| `Kibana`_               | A search console for logs indexed in Elasticsearch      | http://localhost:8001/api/v1/namespaces/kube-ops/services/http:kibana:/proxy/                   |
+-------------------------+---------------------------------------------------------+-------------------------------------------------------------------------------------------------+

See :doc:`../architecture/cluster-services` for more information about these
services and their configuration.

If you want to configure the deployment of those services give a look at
:doc:`advanced_configuration`


.. _Kubernetes dashboard: https://github.com/kubernetes/dashboard
.. _Grafana: https://grafana.com
.. _Cerebro: https://github.com/lmenezes/cerebro
.. _Kibana: https://www.elastic.co/products/kibana/
