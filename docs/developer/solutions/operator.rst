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
as it will embed best practices from the Kubernetes_ community.

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
   └── deploy
       ├── crds
       │   └── some_crd.yaml
       └── role.yaml

Most of these files are generated when using the Operator SDK.

Monitoring
^^^^^^^^^^

MetalK8s does not handle the monitoring of a Solution application, which means:

- the user, manually or through the Solution UI, should create ``Service`` and
  ``ServiceMonitor`` objects for each Operator instance
- Operators should create ``Service`` and ``ServiceMonitor`` objects for each
  deployed component they own

The `Prometheus Operator`_ deployed by MetalK8s has cluster-scoped permissions,
and is able to read the aforementioned ``ServiceMonitor`` objects
to set up monitoring of your application services.

.. _`Prometheus Operator`: https://github.com/coreos/prometheus-operator

Configuration
^^^^^^^^^^^^^

Solution Operator must implement a ``--config`` option which will be used
by MetalK8s to provide various useful information needed by the Operator, such
as the endpoints for the container images.
The given configuration looks like::

   apiVersion: solutions.metalk8s.scality.com/v1alpha1
   kind: OperatorConfig
   repositories:
     <solution-version-x>:
       - endpoint: metalk8s-registry/<solution-name>-<solution-version-x>
         images:
           - <image-x>:<tag-x>
           - <image-y>:<tag-y>
     <solution-version-y>:
       - endpoint: metalk8s-registry/<solution-name>-<solution-version-y>
         images:
           - <image-x>:<tag-x>
           - <image-y>:<tag-y>

In example, for an online installation without MetalK8s providing the
repository, this configuration could be::

    apiVersion: solutions.metalk8s.scality.com/v1alpha1
    kind: OperatorConfig
    repositories:
      1.0.0:
        - endpoint: registry.scality.com/zenko
          images:
            - cloudserver:1.0.0
            - zenko-quorum:1.0.0
        - endpoint: quay.io/coreos
          images:
            - prometheus-operator:v0.34.0

This configuration allows the Operator to retrieve dynamically where
the container images are stored for each version of a given Solution.

Roles
^^^^^

Solution must ship a ``role.yaml`` file located in ``/operator/deploy``
directory. This file is a manifest which declares all necessary ``Role`` and
``ClusterRole`` objects needed by the Operator.
MetalK8s will take care of deploying these objects, create a ``ServiceAccount``
named ``<solution_name>-operator`` and all needed ``RoleBinding`` to bind these
roles to this account.

.. warning::

   Only ``Role`` and ``ClusterRole`` kinds are allowed in this file,
   the deployment of the Solution fails if any other resource is found.
