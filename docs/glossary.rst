Glossary
========

.. _Kubernetes node: https://kubernetes.io/docs/concepts/architecture/nodes/
.. _node manifest: https://kubernetes.io/docs/concepts/architecture/nodes/#management
.. _Kubernetes pod: https://kubernetes.io/docs/concepts/workloads/pods/pod/
.. _kubectl: https://kubernetes.io/docs/reference/kubectl/kubectl/


.. glossary::

   Kubernetes node
     A Kubernetes node is a Kubernetes worker machine - either virtual or physical.
     A node contains the services required to run :term:`Kubernetes pods <Kubernetes pod>`.

     See also the official Kubernetes documentation for `nodes <Kubernetes node>`_.

   Kubernetes node manifest
     The external file used to describe a node, that is used to register a :term:`Kubernetes node`
     with a Kubernetes cluster.

     See also the official Kubernetes documentation for `node management <node manifest>`_.

   Kubernetes pod
     A pod is a group of one or more containers sharing storage and network resources, with
     a specification of how to run these containers.

     See also the official Kubernetes documentation for `pods <Kubernetes node>`_.

   Kubectl
     Kubectl is a CLI interface for running commands against Kubernetes clusters.

     See also the official Kubernetes documentation for `kubectl`_.


