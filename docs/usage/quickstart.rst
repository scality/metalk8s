.. spelling::

   Quickstart
   subdirectory
   Todo
   usernames


Quickstart Guide
================

This guide describes how to set up a MetalK8s test cluster. It offers general
requirements and describes sizing, configuration, and deployment. With respect
to installation procedures, the only significant difference between a test
cluster and a full production environment is the amount of resources required
to implement the design.

.. _MetalK8s: https://github.com/scality/metal-k8s/
.. _CentOS: https://www.centos.org
.. _Kubernetes: https://kubernetes.io

General Cluster Requirements
----------------------------
Setting up a MetalK8s_ test cluster quickly requires three machines
running CentOS_ 7.4 (these can be VMs) to which you have SSH access. Each
machine acting as a Kubernetes_ node (all three in the present example)
must also have at least one disk available to provision storage volumes.

Sizing
^^^^^^

Each node must satisfy the following sizing requirements.

* Cores:

  - 2 for etcd
  - 4 for master
  - 4 for node

* RAM:

  - 4 GB for etcd
  - 8 GB for master
  - 8 GB for node

 .. _storage:

* System storage:

  - 20 GB for the root filesystem
  - 16 GB for etcd
  - 128 GB for master
  - 64 GB for node

Proxies
^^^^^^^
For nodes operating behind a proxy, add the following lines to your local
machine’s /etc/environment file:

.. code-block:: shell

 http_proxy=http://user;pass@<my-ip>:<my-port>
 https_proxy=http://user;pass@<my-ip>:<my-port>
 no_proxy=localhost,127.0.0.1,10.*

Get the MetalK8s Git Repo
-------------------------
Either log in to one of the machines in your cluster and clone the Metalk8s
repo directly from GitHub:

.. code-block:: shell

 $ git clone https://github.com/scality/metal-k8s

or clone it to your local machine and use sftp to put the metalk8s project
directly onto one of the nodes:

.. code-block:: shell

 $ sftp centos@10.0.0.1
 Connected to 10.0.0.1
 sftp> put -r metalk8s

Define an Inventory
-------------------
Each server must be configured in an inventory that identifies the servers to
the Ansible_-based deployment system, as well as their basic configuration,
including masters, etcds, and nodes.

The inventory is a directory containing a hosts file, which lists all hosts
in the cluster, and kube-node.yml, a configuration file.

.. _Ansible: https://www.ansible.com

To create an inventory:

1. Log in to the machine to which you cloned or put the git repo, as described
   in the previous section.

2. Create a directory (for example, :file:`inventory/quickstart-cluster`) in
   which the inventory will be stored. Change to that directory.

   .. code-block:: shell

    $ cd metal-k8s
    $ mkdir -p inventory/quickstart-cluster
    $ cd inventory/quickstart-cluster/

3. Create the :file:`hosts` file, which lists all hosts.

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

   Change the host names, IP addresses, and user names to conform to your
   infrastructure. For example, if your servers are named “server1”, “server2”,
   and “server3”, copy the code block above and replace ALL instances of
   “node-0” with “server”.

4. Create a :file:`group_vars` subdirectory in the directory you created in
   step 2 (the same directory as the :file:`hosts` file) and change to it.

   .. code-block:: shell

    $ mkdir group_vars ; cd group_vars

5. Create a file, :file:`kube-node.yml`, in the :file:`group_vars` subdirectory
   of the inventory. This file declares how to set up storage (in the default
   configuration) on hosts in the kube-node group; that is, hosts on which pods
   shall be scheduled:

   .. code-block:: yaml

    metalk8s_lvm_drives_vg_metalk8s: ['/dev/vdb']

   This example assumes every *kube-node* host has a disk available as
   :file:`/dev/vdb` that can be used to set up Kubernetes *PersistentVolumes*.
   For more information, see storage_.

.. note:: If you are upgrading from an early (pre-0.2.0) MetalK8s release, you must enter additional settings. See “Upgrading from MetalK8s < 0.2.0” (upgrade_from_pre-0.2.0.rst, also in this directory)

Enter the MetalK8s Virtual Environment Shell
--------------------------------------------
To install a supported version of Ansible and its dependencies, along with
some Kubernetes tools (:program:`kubectl` and :program:`helm`), MetalK8s
provides a :program:`make` target that installs these in a local environment.
To enter this environment, run :command:`make shell` (this takes a few
seconds when first run)::


    $ make shell
    Creating virtualenv...
    Installing Python dependencies...
    Downloading kubectl...
    Downloading Helm...
    Launching MetalK8s shell environment. Run 'exit' to quit.
    (metal-k8s) $

Deploy the Cluster
------------------
Run the following command to deploy the cluster::

   (metal-k8s) $ ansible-playbook -i inventory/quickstart-cluster -b playbooks/deploy.yml

Deployment takes about a half hour.

Inspect the Cluster
-------------------
Deployment creates a file containing credentials to access the cluster
(:file:`inventory/quickstart-cluster/artifacts/admin.conf`). Remaining in the
virtual environment shell, export this locationto give :program:`kubectl` and
:program:`helm` the correct paths and credentials to contact the cluster’s
*kube-master* nodes::

    (metal-k8s) $ export KUBECONFIG=`pwd`/inventory/quickstart-cluster/artifacts/admin.conf

If your system can reach port 6443 on the first kube-master node, you can

* List all nodes::


    (metal-k8s) $ kubectl get nodes
    NAME        STATUS    ROLES            AGE       VERSION
    node-01     Ready     master,node      1m        v1.9.5+coreos.0
    node-02     Ready     master,node      1m        v1.9.5+coreos.0
    node-03     Ready     master,node      1m        v1.9.5+coreos.0

* List all pods::

    (metal-k8s) $ kubectl get pods --all-namespaces
    NAMESPACE     NAME                                                 READY  STATUS    RESTARTS  AGE
    kube-ingress  nginx-ingress-controller-9d8jh                       1/1    Running   0         1m
    kube-ingress  nginx-ingress-controller-d7vvg                       1/1    Running   0         1m
    kube-ingress  nginx-ingress-controller-m8jpq                       1/1    Running   0         1m
    kube-ingress  nginx-ingress-default-backend-6664bc64c9-xsws5       1/1    Running   0         1m
    kube-ops      alertmanager-kube-prometheus-0                       2/2    Running   0         2m
    kube-ops      alertmanager-kube-prometheus-1                       2/2    Running   0         2m
    kube-ops      es-client-7cf569f5d8-2z974                           1/1    Running   0         2m
    kube-ops      es-client-7cf569f5d8-qq4h2                           1/1    Running   0         2m
    kube-ops      es-data-cd5446fff-pkmhn                              1/1    Running   0         2m
    kube-ops      es-data-cd5446fff-zzd2h                              1/1    Running   0         2m
    kube-ops      es-exporter-elasticsearch-exporter-7df5bcf58b-k9fdd  1/1    Running   3         1m
    ...

* List all deployed Helm_ applications::

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
Services to operate and monitor your MetalK8s cluster are provided. To
access these dashboards:

1. Copy the credentials in
   :file:`inventory/quickstart-cluster/artifacts/admin.conf` to your local
   machine. Export this path locally with::

       $ export KUBECONFIG=`pwd`/inventory/quickstart-cluster/artifacts/admin.conf

2. On your cluster, open port 6443 for remote access to cluster services.

3. Run ``kubectl proxy`` from your local machine. This opens a tunnel to the
   Kubernetes cluster, which makes the following tools available:

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

.. _Kubernetes dashboard: https://github.com/kubernetes/dashboard
.. _Grafana: https://grafana.com
.. _Cerebro: https://github.com/lmenezes/cerebro
.. _Kibana: https://www.elastic.co/products/kibana/
