Solution Operator guidelines
============================

..

   An Operator is a method of packaging, deploying and managing a Kubernetes
   application. A Kubernetes application is an application that is both
   deployed on Kubernetes and managed using the Kubernetes APIs and ``kubectl``
   tooling.

   -- `coreos.com/operators <https://coreos.com/operators/>`_


MetalK8s *Solutions* are a concept mostly centered around the Operator pattern.
While there is no explicit requirements except the ones described below (see
:ref:`solution-operator-requirements`), we recommend using the `Operator SDK`_
as it will embed best practices from the Kubernetes_ community. We also include
some :ref:`solution-operator-recommendations`.

.. _`Operator SDK`: https://github.com/operator-framework/operator-sdk/
.. _Kubernetes: https://kubernetes.io/


.. _solution-operator-requirements:

Requirements
------------

Files
^^^^^

All Operator-related files except for the container images (see
:ref:`solution-archive-images`) should be stored under ``/operator`` in the ISO
archive. Those files should be organized as follows::

   operator
   ├── crd
   │   └── some_crd_name.yaml
   └── deploy
       ├── operator.yaml
       ├── role.yaml
       ├── role_binding.yaml
       └── service_account.yaml

Most of these files are generated when using the Operator SDK.

.. todo::

   Specify each of them, include example (after `#1060`_ is done).
   Remember to note specificities about ``OCI_REPOSITORY_PREFIX`` / namespaces.
   Think about using ``kustomize`` (or ``kubectl apply -k``, though only
   available from K8s 1.14).

.. _`#1060`: https://github.com/scality/metalk8s/issues/1060

Monitoring
^^^^^^^^^^

MetalK8s does not handle the monitoring of a Solution application, which means:

- the user, manually or through the Solution UI, should create ``Service`` and
  ``ServiceMonitor`` objects for each Operator instance
- Operators should create ``Service`` and ``ServiceMonitor`` objects for each
  deployed component they own

.. _solution-operator-recommendations:

Recommendations
---------------

Permissions
^^^^^^^^^^^

MetalK8s does not provide tools to deploy the Operator itself, so that users
can have better control over which version runs where.

The best-practice encouraged here is to use namespace-scoped permissions for
the Operator, instead of cluster-scoped.

.. note::

   Future improvements to MetalK8s may include the addition of an "Operator for
   Operators", such as the `Operator Lifecycle Manager`_.

.. _`Operator Lifecycle Manager`:
   https://github.com/operator-framework/operator-lifecycle-manager
