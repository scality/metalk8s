Introduction
============

With a focus on having minimal human actions required, both in its deployment
and operation, MetalK8s also intends to ease deployment and operation of
complex applications, named *Solutions*, on its cluster.

This document defines what a *Solution* refers to, the responsibilities of each
party in this integration, and will link to relevant documentation pages for
detailed information.

What is a *Solution*?
---------------------

We use the term *Solution* to describe a packaged Kubernetes application,
archived as an ISO disk image, containing:

- A set of OCI images to inject in MetalK8s image registry
- An `Operator`_ to deploy on the cluster
- Optionally, a UI for managing and monitoring the application, represented by
  a standard Kubernetes ``Deployment``

.. _Operator: https://coreos.com/blog/introducing-operators.html

For more details, see the following documentation pages:

- :doc:`./archive`
- :doc:`./operator`
- (TODO) Solution UI guidelines

Once a Solution is deployed on MetalK8s, a user can deploy one or more versions
of the Solution Operator, using either the Solution UI or the Kubernetes API,
into separate namespaces. Using the Operator-defined ``CustomResource(s)``, the
user can then effectively deploy the application packaged in the Solution.

How is a *Solution* declared in MetalK8s?
-----------------------------------------

MetalK8s already uses a ``BootstrapConfiguration`` object, stored in
``/etc/metalk8s/bootstrap.yaml``, to define how the cluster should be
configured from the bootstrap node, and what versions of MetalK8s are available
to the cluster.

In the same vein, we want to use a ``SolutionsConfiguration`` object, stored in
``/etc/metalk8s/solutions.yaml``, to declare which Solutions are available to
the cluster, from the bootstrap node.

.. todo:: Add specification in a future Reference guide

Here is how it could look::

    apiVersion: metalk8s.scality.com/v1alpha1
    kind: SolutionsConfiguration
    solutions:
      - /solutions/storage_1.0.0.iso
      - /solutions/storage_latest.iso
      - /other_solutions/computing.iso

There would be no explicit information about what an archive contains.
Instead, we want the archive itself to contain such information (more
details in :doc:`./archive`), and to discover it at import time.

Note that Solutions will be **imported** based on this file contents, i.e.
the images they contain will be made available in the registry and the UI
will be deployed, however **deploying** the Operator and subsequent
application(s) is left to the user, through manual operations or the Solution
UI.

.. note::

   Removing an archive path from the ``solutions`` list will effectively
   remove the Solution images and UI when the "import solutions" playbook is
   run.

Responsibilities of each party
------------------------------

This section intends to define the boundaries between MetalK8s and the
Solutions to integrate with, in terms of "who is doing what?".

.. note:: This is still a work in progress.

MetalK8s
^^^^^^^^

**MUST**:

- Handle reading and mounting of the Solution ISO archive
- Provide tooling to deploy/upgrade a Solution's CRDs and UI

**MAY**:

- Provide tooling to deploy/upgrade a Solution's Operator
- Provide tooling to verify signatures in a Solution ISO
- Expose management of Solutions in its own UI

Solution
^^^^^^^^

**MUST**:

- Comply with the standard archive structure defined by MetalK8s
- If providing a UI, expose management of its Operator instances
- Handle monitoring of its own services (both Operator and application, except
  the UI)

**SHOULD**:

- Use MetalK8s monitoring services (Prometheus and Grafana)

.. note::

   Solutions can leverage the `Prometheus Operator`_ CRs for setting up the
   monitoring of their components. For more information, see
   :doc:`/developer/architecture/monitoring` and :doc:`./operator`.

.. todo:: Define how Solutions can deploy Grafana dashboards.

.. _`Prometheus Operator`: https://github.com/coreos/prometheus-operator

Interaction diagrams
--------------------

We include a detailed interaction sequence diagram for describing how MetalK8s
will handle user input when deploying / upgrading Solutions.

.. note:: Open the image in a new tab to see it in full resolution.

.. uml:: deployment.uml

.. todo::

   A detailed diagram for Operator deployment would be useful (wait for
   `#1060`_ to land). Also, add another diagram for specific operations in an
   upgrade scenario using two Namespaces, for staging/testing the new version.

.. _`#1060`: https://github.com/scality/metalk8s/issues/1060
