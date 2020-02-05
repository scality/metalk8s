Introduction
============

Foreword
^^^^^^^^
MetalK8s is a Kubernetes_ distribution with a number of add-ons selected for
on-premises deployments, including pre-configured monitoring and alerting,
self-healing system configuration, and more.

The installation of a MetalK8s cluster can be broken down into
the following steps:

#. :doc:`Setup <./setup>` of the environment
#. :doc:`Deployment <./bootstrap>` of the :term:`Bootstrap node`, the first
   machine in the cluster
#. :doc:`Expansion <./expansion>` of the cluster, orchestrated from the
   Bootstrap node
#. :doc:`Post installation <./post-install>` configuration steps and sanity
   checks

.. _Kubernetes: https://kubernetes.io/

.. _installation-intro-architecture:

Choosing a Deployment Architecture
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Before starting the installation, choosing an architecture is recommended, as
it can impact sizing of the machines and other infrastructure-related details.

.. note:: "Machines" may indicate bare-metal servers or VMs interchangeably.

.. warning::

   MetalK8s is not designed to handle world-distributed multi-sites
   architectures. Instead, it focuses on providing a highly resilient cluster
   at the datacenter scale. To manage multiple sites, look into solutions
   provided at the application level, or alternatives from the community
   (such as what `the SIG Multicluster
   <https://github.com/kubernetes/community/tree/master/sig-multicluster>`_
   provides).

Standard Architecture
"""""""""""""""""""""
The recommended architecture when installing a small-sized MetalK8s cluster
emphasizes ease of installation, while providing a high stability for the
scheduled workloads:

- One machine running Bootstrap and control plane services
- Two other machines running control plane and Infra services
- Three more machines for workload applications

.. image:: img/standard-arch.png
   :width: 100%

Machines dedicated to the control plane do not need large
amounts of resources (see
:ref:`the sizing notes below<installation-intro-sizing>`), and can safely run
as virtual machines. Running workloads on dedicated machines also allows for
simpler sizing of said machines, as MetalK8s impact would be negligible.

Extended Architecture
"""""""""""""""""""""
This example architecture focuses on reliability rather than compacity,
offering the finest control over the entire platform:

- One machine dedicated to running Bootstrap services (see
  :ref:`the Bootstrap role<node-role-bootstrap>` definition below)
- Three extra machines (or five if installing a really large cluster,
  e.g. >100 nodes) for running the Kubernetes_ control plane (with
  :ref:`core K8s services<node-role-master>` and the backing
  :ref:`etcd DB<node-role-etcd>`)
- One or more machines dedicated to running Infra services (see
  :ref:`the Infra role<node-role-infra>`)
- Any number of machines dedicated to running applications, the number and
  :ref:`sizing<installation-intro-sizing>` depending on the applications (for
  instance, Zenko_ would recommend using three or more machines)

.. image:: img/extended-arch.png
   :width: 100%

.. _Zenko: https://zenko.io/

.. _installation-intro-compact-arch:

Compact Architectures
"""""""""""""""""""""
While not being focused on having the smallest compute and memory footprints,
MetalK8s can provide a fully functional single node "cluster". The Bootstrap
node can be configured to also allow running applications next to all the other
services required (see :ref:`the section about taints<node-taints>` below).

A single node cluster does not provide any form of resilience to machine or
site failure, which is why the recommended most compact architecture to use in
production includes three machines:

- Two machines running control plane services alongside infra and workload
  applications
- One machine running Bootstrap services in addition to all the other services

.. image:: img/compact-arch.png
   :width: 100%

.. note::

   Sizing of such compact clusters needs to account for the expected load,
   and the exact impact of colocating an application with MetalK8s services
   needs to be evaluated by said application's provider.


Variations
""""""""""
It is possible to customize the chosen architecture using combinations of
:ref:`roles<node-roles>` and :ref:`taints<node-taints>`, which are described
below, to adapt to the available infrastructure.

As a general recommendation, it is easier to monitor and operate well-isolated
groups of machines in the cluster, where hardware issues would only impact one
group of services.

It is also possible to evolve an architecture after initial deployment, in case
the underlying infrastructure also evolves (new machines can be added through
the :doc:`expansion<./expansion>` mechanism, roles can be added or removed...).


Concepts
^^^^^^^^
Although being familiar with
`Kubernetes concepts <https://kubernetes.io/docs/concepts/>`_
is recommended, the necessary concepts to grasp before installing a MetalK8s
cluster are presented here.

Nodes
"""""
:term:`Nodes <Node>` are Kubernetes worker machines, which allow running
containers and can be managed by the cluster (control plane services,
described below).

Control Plane and Workload Plane
""""""""""""""""""""""""""""""""
This dichotomy is central to MetalK8s, and often referred to in other
Kubernetes concepts.

The **control plane** is the set of machines (called :term:`nodes <Node>`) and
the services running there that make up the essential Kubernetes functionality
for running containerized applications, managing declarative objects, and
providing authentication/authorization to end-users as well as services.
The main components making up a Kubernetes control plane are:

- :term:`API Server`
- :term:`Scheduler`
- :term:`Controller Manager`

The **workload plane** indicates the set of nodes where applications
will be deployed via Kubernetes objects, managed by services provided by the
**control plane**.

.. note::

   Nodes may belong to both planes, so that one can run applications
   alongside the control plane services.

Control plane nodes often are responsible for providing storage for
:term:`API Server`, by running :term:`etcd`. This responsibility may be
offloaded to other nodes from the workload plane (without the ``etcd`` taint).

.. _node-roles:

Node Roles
""""""""""
Determining a :term:`Node` responsibilities is achieved using **roles**.
Roles are stored in :term:`Node manifests <Node manifest>` using labels, of the
form ``node-role.kubernetes.io/<role-name>: ''``.

MetalK8s uses five different **roles**, that may be combined freely:

.. _node-role-master:

``node-role.kubernetes.io/master``
  The ``master`` role marks a control plane member. control plane services
  (see above) can only be scheduled on ``master`` nodes.

.. _node-role-etcd:

``node-role.kubernetes.io/etcd``
  The ``etcd`` role marks a node running :term:`etcd` for storage of
  :term:`API Server`.

.. _node-role-infra:

``node-role.kubernetes.io/infra``
  The ``infra`` role is specific to MetalK8s. It serves for marking nodes where
  non-critical services provided by the cluster (monitoring stack, UIs, etc.)
  are running.

.. _node-role-bootstrap:

``node-role.kubernetes.io/bootstrap``
  This marks the :term:`Bootstrap node`. This node is unique in the cluster,
  and is solely responsible for the following services:

  - An RPM package repository used by cluster members
  - An OCI registry for :term:`Pods <Pod>` images
  - A :term:`Salt Master` and its associated :term:`SaltAPI`

  In practice, this role is used in conjunction with the ``master``
  and ``etcd`` roles for bootstrapping the control plane.

In the :ref:`architecture diagrams<installation-intro-architecture>` presented
above, each box represents a role (with the ``node-role.kubernetes.io/`` prefix
omitted).

.. _node-taints:

Node Taints
"""""""""""
:term:`Taints <Taint>` are complementary to roles. When a taint or a set of
taints is applied to a :term:`Node`, only :term:`Pods <Pod>` with the
corresponding :term:`tolerations <Toleration>` can be scheduled on that Node.

Taints allow dedicating Nodes to specific use-cases, such as having Nodes
dedicated to running control plane services.

Refer to the :ref:`architecture diagrams<installation-intro-architecture>`
above for examples: each **T** marker on a role means the taint corresponding
to this role has been applied on the Node.

Note that Pods from the control plane services (corresponding to ``master`` and
``etcd`` roles) have tolerations for the ``bootstrap`` and ``infra`` taints.
This is because after :doc:`bootstrapping the first Node<./bootstrap>`, it
will be configured as follows:

.. image:: img/bootstrap-single-node-arch.png
   :width: 100%

The taints applied are only tolerated by services deployed by MetalK8s. If the
selected architecture requires workloads to run on the Bootstrap node, these
taints should be removed.

.. image:: img/bootstrap-remove-taints.png
   :width: 100%

To achieve this, use the following commands after deployment:

.. code-block:: shell

   root@bootstrap $ kubectl taint nodes <bootstrap-node-name> \
                      node-role.kubernetes.io/bootstrap:NoSchedule-
   root@bootstrap $ kubectl taint nodes <bootstrap-node-name> \
                      node-role.kubernetes.io/infra:NoSchedule-

.. note::

   To get more in-depth information about taints and tolerations, see
   `the official Kubernetes documentation
   <https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/>`_.

.. _installation-intro-networks:

Networks
""""""""
A MetalK8s cluster requires a physical network for both the control plane and
the workload plane Nodes. Although these may be the same network, the
distinction will still be made in further references to these networks, and
when referring to a Node IP address. Each Node in the cluster **must** belong
to these two networks.

The control plane network will serve for cluster services to communicate with
each other. The workload plane network will serve for exposing applications,
including the ones in ``infra`` Nodes, to the outside world.

.. todo:: Reference Ingress

MetalK8s also allows one to configure virtual networks used for internal
communications:

- A network for :term:`Pods <Pod>`, defaulting to ``10.233.0.0/16``
- A network for :term:`Services <Service>`, defaulting to ``10.96.0.0/12``

In case of conflicts with the existing infrastructure, make sure to choose
other ranges during the
:ref:`Bootstrap configuration <Bootstrap Configuration>`.


Additional Notes
^^^^^^^^^^^^^^^^

.. _installation-intro-sizing:

Sizing
""""""
Defining an appropriate sizing for the machines in a MetalK8s cluster strongly
depends on the selected architecture and the expected future variations to
this architecture. Refer to the documentation of the applications planned to
run in the deployed cluster before completing the sizing, as their needs will
compete with the cluster's.

Each :ref:`role<node-roles>`, describing a group of services, requires a
certain amount of resources for it to run properly. If multiple roles are used
on a single Node, these requirements add up.

+----------------+-----------------------+----------+--------+---------------------------------+-----------------------------+
|      Role      |       Services        |   CPU    |  RAM   |        Required storage         |     Recommended storage     |
+================+=======================+==========+========+=================================+=============================+
| bootstrap      | Package repositories, | 1 core   | 2 GB   | Sufficient space for the        |                             |
|                | container registries, |          |        | product ISO archives            |                             |
|                | Salt master           |          |        |                                 |                             |
+----------------+-----------------------+----------+--------+---------------------------------+-----------------------------+
| etcd           | ``etcd`` database     | 0.5 core | 1 GB   | 1 GB for                        |                             |
|                | for K8s API           |          |        | ``/var/lib/etcd``               |                             |
+----------------+-----------------------+----------+--------+---------------------------------+-----------------------------+
| master         | K8s API,              | 0.5 core | 1 GB   |                                 |                             |
|                | scheduler, and        |          |        |                                 |                             |
|                | controllers           |          |        |                                 |                             |
+----------------+-----------------------+----------+--------+---------------------------------+-----------------------------+
| infra          | Monitoring services,  | 0.5 core | 2 GB   | 10 GB partition for Prometheus  |                             |
|                | Ingress controllers   |          |        | 1 GB partition for Alertmanager |                             |
+----------------+-----------------------+----------+--------+---------------------------------+-----------------------------+
| *requirements* | Salt minion,          | 0.2 core | 0.5 GB | **40 GB root partition**        | 100 GB or more for ``/var`` |
| *common to*    | Kubelet               |          |        |                                 |                             |
| *any Node*     |                       |          |        |                                 |                             |
+----------------+-----------------------+----------+--------+---------------------------------+-----------------------------+

These numbers are not accounting for highly unstable workloads or other sources
of unpredictable load on the cluster services, and it is recommended to provide
an additional 50% of resources as a safety margin.

Consider the `official recommendations for etcd sizing
<https://github.com/etcd-io/etcd/blob/master/Documentation/op-guide/hardware.md>`_
as the stability of a MetalK8s installation depends strongly on the backing
``etcd`` stability (see :ref:`this note<Setup etcd partition>` for more
details). Prometheus and Alertmanager also require storage, as explained in
:ref:`this section<Provision Prometheus Storage>`.

.. _installation-intro-cloud:

Deploying with Cloud Providers
""""""""""""""""""""""""""""""
When installing in a virtual environment, such as `AWS EC2`_ or `OpenStack`_,
special care will be needed for adjusting networks configuration. Virtual
environments often add a layer of security at the port level, which should be
disabled, or circumvented with :ref:`IP-in-IP encapsulation<enable IP-in-IP>`.

Also note that Kubernetes has numerous integrations with existing cloud
providers to provide easier access to proprietary features, such as
load balancers. For more information, see
`this documentation article
<https://kubernetes.io/docs/concepts/cluster-administration/cloud-providers/>`_.

.. _AWS EC2: https://aws.amazon.com/ec2/
.. _OpenStack: https://www.openstack.org/
