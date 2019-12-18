Introduction
============

Concepts
^^^^^^^^
Although being familiar with
`Kubernetes concepts <https://kubernetes.io/docs/concepts/>`_
is recommended, the necessary concepts to grasp before installing a MetalK8s
cluster are presented here.

Nodes
"""""
:term:`Nodes <Node>` are Kubernetes worker machines, which allow running
containers and can be managed by the cluster (control-plane services,
described below).

Control-plane and Workload-plane
""""""""""""""""""""""""""""""""
This dichotomy is central to MetalK8s, and often referred to in other
Kubernetes concepts.

The **control-plane** is the set of machines (called :term:`nodes <Node>`) and
the services running there that make up the essential Kubernetes functionality
for running containerized applications, managing declarative objects, and
providing authentication/authorization to end-users as well as services.
The main components making up a Kubernetes control-plane are:

- :term:`API Server`
- :term:`Scheduler`
- :term:`Controller Manager`

The **workload-plane** indicates the set of nodes where applications
will be deployed via Kubernetes objects, managed by services provided by the
**control-plane**.

.. note::

   Nodes may belong to both planes, so that one can run applications
   alongside the control-plane services.

Control-plane nodes often are responsible for providing storage for
:term:`API Server`, by running :term:`etcd`. This responsibility may be
offloaded to other nodes from the workload-plane (without the ``etcd`` taint).

Node Roles
""""""""""
Determining a :term:`Node` responsibilities is achieved using **roles**.
Roles are stored in :term:`Node manifests <Node manifest>` using labels, of the
form ``node-role.kubernetes.io/<role-name>: ''``.

MetalK8s uses five different **roles**, that may be combined freely:

``node-role.kubernetes.io/master``
  The ``master`` role marks a control-plane member. Control-plane services
  (see above) can only be scheduled on ``master`` nodes.

``node-role.kubernetes.io/etcd``
  The ``etcd`` role marks a node running :term:`etcd` for storage of
  :term:`API Server`.

``node-role.kubernetes.io/node``
  This role marks a workload-plane node. It is included implicitly by all
  other roles.

``node-role.kubernetes.io/infra``
  The ``infra`` role is specific to MetalK8s. It serves for marking nodes where
  non-critical services provided by the cluster (monitoring stack, UIs, etc.)
  are running.

``node-role.kubernetes.io/bootstrap``
  This marks the :term:`Bootstrap node`. This node is unique in the cluster,
  and is solely responsible for the following services:

  - An RPM package repository used by cluster members
  - An OCI registry for :term:`Pods <Pod>` images
  - A :term:`Salt Master` and its associated :term:`SaltAPI`

  In practice, this role will be used in conjunction with the ``master``
  and ``etcd`` roles for bootstrapping the control-plane.

Node Taints
"""""""""""
:term:`Taints <Taint>` are complementary to roles. When a taint, or a set of
taints, are applied to a :term:`Node`, only :term:`Pods <Pod>` with the
corresponding :term:`tolerations <Toleration>` can be scheduled on that Node.

Taints allow dedicating Nodes to specific use-cases, such as having Nodes
dedicated to running control-plane services.


.. _quickstart-intro-networks:

Networks
""""""""
A MetalK8s cluster requires a physical network for both the control-plane and
the workload-plane Nodes. Although these may be the same network, the
distinction will still be made in further references to these networks, and
when referring to a Node IP address. Each Node in the cluster **must** belong
to these two networks.

The control-plane network will serve for cluster services to communicate with
each other. The workload-plane network will serve for exposing applications,
including the ones in ``infra`` Nodes, to the outside world.

.. todo:: Reference Ingress

MetalK8s also allows one to configure virtual networks used for internal
communications:

- A network for :term:`Pods <Pod>`, defaulting to ``10.233.0.0/16``
- A network for :term:`Services <Service>`, defaulting to ``10.96.0.0/12``

In case of conflicts with the existing infrastructure, make sure to choose
other ranges during the
:ref:`Bootstrap configuration <Bootstrap Configuration>`.


.. _quickstart-intro-install-plan:

Installation Plan
^^^^^^^^^^^^^^^^^
In this guide, the depicted installation procedure is for a medium sized
cluster, using three control-plane nodes and two worker nodes. Refer to
the :doc:`/installation/index` for extensive explanations of possible
cluster architectures.

.. note::

   This image depicts the architecture deployed with this Quickstart guide.

   .. image:: img/architecture.png
      :width: 100%

   .. todo::

      - describe architecture schema, include legend
      - improve architecture explanation and presentation

The installation process can be broken down into the following steps:

#. :doc:`Setup <./setup>` of the environment (with requirements and example
   OpenStack deployment)
#. :doc:`Deployment <./bootstrap>` of the :term:`Bootstrap node`
#. :doc:`Expansion <./expansion>` of the cluster from the Bootstrap node

.. todo:: Include a link to example Solution deployment?
