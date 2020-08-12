Solutions
=========

Context
-------

As for now, if we want to deploy applications on a MetalK8s cluster,
it's achievable by applying manifest through ``kubectl apply -f manifest.yaml``
or using Helm_ with charts.

These approaches work, but for an offline environment, the user must first
inject all the needed images in containerd_ on every nodes.
Plus, this requires some Kubernetes knowledge to be able to install an
application.

Moreover, there is no control on what's deployed, so it is difficult to
enforce certain practices or provide tooling to ease deployment or
lifecycle management of these applications.

We also want MetalK8s to be responsible for deploying applications to keep
Kubernetes as an implementation detail for the end user and as so the
user does not need any specific knowledge around it to manage its applications.

.. _Helm: https://helm.sh/
.. _containerd: https://containerd.io/

Requirements
------------

* Ability to orchestrate the deployment and lifecycle of complex applications.
* Support offline deployment, upgrade and downgrade of applications with
  arbitrary container images.
* Applications must keep running after a node reboot or a rescheduling of
  the containers.
* Check archives integrity, validity and authenticity.
* Handle multiple instance of an application with same or different versions.
* Enforce practices (Operator pattern).
* Guidelines for applications developers.

User Stories
------------

Application import
~~~~~~~~~~~~~~~~~~

As a cluster administrator, I want to be able to import an application archive
using a CLI tool, to make the application available for deployment.

Application deployment and lifecycle
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

As an application administrator, I want to manage the deployment and lifecycle
(upgrade/downgrade/scaling/configuration/deletion) of an application using
either a UI or through simple CLI commands (both should be available).

Multiple instances of an application
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

As an application administrator, I want to be able to deploy both a test
and a prod environments for an application, without collision between them,
so that I can qualify/test the application on the test environment.

Application development
~~~~~~~~~~~~~~~~~~~~~~~

As a developer, I want to have guidelines to follow to develop an application.

Application packaging
~~~~~~~~~~~~~~~~~~~~~

As a developer, I want to have documentation to know how to package an
application.

Application validation
~~~~~~~~~~~~~~~~~~~~~~

As a developer, I want to be able to know that a packaged application
follows the requirements and is valid using a CLI tool.

Design Choices
--------------

Solutions
~~~~~~~~~

What's a Solution
"""""""""""""""""

It's a packaged Kubernetes application, archived as an ISO disk image,
containing:

 * A set of OCI images to inject in MetalK8s image registry
 * An Operator to deploy on the cluster
 * A UI to manage and monitor the application (optional)

Solution Configuration
""""""""""""""""""""""

MetalK8s already uses a ``BootstrapConfiguration`` object, stored in
``/etc/metalk8s/bootstrap.yaml``, to define how the cluster should be
configured from the bootstrap node, and what versions of MetalK8s are
available to the cluster.

In the same way, we will use a ``SolutionsConfiguration`` object, stored in
``/etc/metalk8s/solutions.yaml``, to declare which Solutions are available
to the cluster, from the bootstrap node.

Here is how it will look::

    apiVersion: solutions.metalk8s.scality.com/v1alpha1
    kind: SolutionsConfiguration
    archives:
      - /path/to/solution/archive.iso
    active:
      solution-name: X.Y.Z-suffix (or 'latest')

In this configuration file, no explicit information about the contents of
archives should appear. When read by Salt at import time, the archive metadata
will be discovered from the archive itself using a ``manifest.yaml`` file at
the root of the archive, with the following format::

    apiVersion: solutions.metalk8s.scality.com/v1alpha1
    kind: Solution
    metadata:
      annotations:
        solutions.metalk8s.scality.com/display-name: Solution Name
      labels: {}
      name: solution-name
    spec:
      images:
        - some-extra-image:2.0.0
        - solution-name-operator:1.0.0
        - solution-name-ui:1.0.0
      operator:
        image:
          name: solution-name-operator
          tag: 1.0.0
      version: 1.0.0

This manifest will be read by a Salt external pillar module,
which will permit the consumption of them by Salt modules and states.

The external pillar will be structured as follows::

    metalk8s:
      solutions:
        available:
          solution-name:
            - active: True
              archive: /path/to/solution/archive.iso
              manifest:
                # The content of Solution manifest.yaml
                apiVersion: solutions.metalk8s.scality.com/v1alpha1
                kind: Solution
                metadata:
                  annotations:
                    solutions.metalk8s.scality.com/display-name: Solution Name
                  labels: {}
                  name: solution-name
                spec:
                  images:
                    - some-extra-image:2.0.0
                    - solution-name-operator:1.0.0
                    - solution-name-ui:1.0.0
                  operator:
                    image:
                      name: solution-name-operator
                      tag: 1.0.0
                  version: 1.0.0
              id: solution-name-1.0.0
              mountpoint: /srv/scality/solution-name-1.0.0
              name: Solution Name
              version: 1.0.0
        config:
          # Content of /etc/metalk8s/solutions.yaml (SolutionsConfiguration)
          apiVersion: solutions.metalk8s.scality.com/v1alpha1
          kind: SolutionsConfiguration
          archives:
            - /path/to/solutions/archive.iso
          active:
            solution-name: X.Y.Z-suffix (or 'latest')
        environments:
          # Fetched from namespaces with label
          # solutions.metalk8s.scality.com/environment
          env-name:
            # Fetched from namespace annotations
            # solutions.metalk8s.scality.com/environment-description
            description: Environment description
            namespaces:
              solution-a-namespace:
                # Data of metalk8s-environment ConfigMap from this namespace
                config:
                  solution-name: 1.0.0
              solution-b-namespace:
                config: {}

Archive format
~~~~~~~~~~~~~~

The archive will be packaged as an ISO image.

We chose the ISO image format instead of a compressed archive,
like a tarball, because we wanted something easier to inspect without having
to uncompress it.

It could also be useful to be able to burn it on a CD, when being in an
offline environment and/or with strong security measures (read-only device that
can be easily verified).

Solution archive will be structured as follows::

   .
   ├── images
   │   └── some_image_name
   │       └── 1.0.1
   │           ├── <layer_digest>
   │           ├── manifest.json
   │           └── version
   ├── manifest.yaml
   ├── operator
   |   └── deploy
   │       ├── crds
   │       │   └── some_crd_name.yaml
   │       └── role.yaml
   └── registry-config.inc

OCI Images registry
~~~~~~~~~~~~~~~~~~~

Every container images from Solution archive will be exposed as a single
repository through MetalK8s registry. The name of this repository will be
computed from the Solution manifest ``<metadata.name>-<spec.version>``.


Operator Configuration
~~~~~~~~~~~~~~~~~~~~~~

Each Solution Operator needs to implement a ``--config`` flag which will
be used to provide a yaml configuration file.
This configuration will contain the list of available images for a Solution
and where to fetch them.
This configuration will be formatted as follows::

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

Solution environment
~~~~~~~~~~~~~~~~~~~~

Solutions will be deployed into an ``Environment``, which is basically a
namespace or a group of namespaces with a specific label
``solutions.metalk8s.scality.com/environment``, containing the ``Environment``
name, and an annotation
``solutions.metalk8s.scality.com/environment-description``, providing a
human readable description of it::

    apiVersion: v1
    kind: Namespace
    metadata:
      annotations:
        solutions.metalk8s.scality.com/environment-description: <env-description>
      labels:
        solutions.metalk8s.scality.com/environment: <env-name>
      name: <namespace-name>

It allows to run multiple instances of a Solution, optionally with different
versions, on the same cluster, without collision between them.

Each namespace in an environment will have a :term:`ConfigMap`
``metalk8s-environment`` deployed which will describe what an environment is
composed of (Solutions and versions). This :term:`ConfigMap` will then be
consumed by Salt to deploy Solutions Operators.

This :term:`ConfigMap` will be structured as follows::

    apiVersion: solutions.metalk8s.scality.com/v1alpha1
    kind: ConfigMap
    metadata:
      name: metalk8s-environment
      namespace: <namespace-name>
    data:
      <solution-x-name>: <solution-x-version>
      <solution-y-name>: <solution-y-version>

``Environments`` will be created by a CLI tool or through the MetalK8s
Environment page (both should be available), prior to deploy Solutions.

Solution management
~~~~~~~~~~~~~~~~~~~

We will provide CLI and UI to import, deploy and handle the whole lifecycle
of a Solution. These tools are wrapper around Salt formulas.

Interaction diagram
~~~~~~~~~~~~~~~~~~~

We include a detailed interaction sequence diagram for describing how MetalK8s
will handle user input when deploying / upgrading Solutions.

.. uml:: solutions-interaction.uml

Rejected design choices
-----------------------

CNAB_
~~~~~

The Cloud Native Application Bundle (CNAB_) is a standard packaging format
for multi-component distributed applications. It basically offers what MetalK8s
Solution does, but with the need of an extra container with almost full access
to the Kubernetes cluster and that’s the reason why we did choose to not use
it.

We also want to enforce some practices (Operator pattern) in Solutions
and this is not easily doable using it.

Moreover, CNAB_ is a pretty young project and has not yet been adopted by a
lot of people, so it's hard to predict its future.

.. _CNAB: https://cnab.io

Implementation Details
----------------------

Iteration 1
~~~~~~~~~~~

* Solution example, this is a fake application, with no other goal than
  allowing testing of MetalK8s Solutions tooling.
* Salt formulas to manage Solution (deployment and lifecycle).
* Tooling around Salt formulas to ease Solutions management
  (simple shell script).
* MetalK8s UI to manage Solution.
* Solution automated tests (deployment, upgrade/downgrade, deletion, ...)
  in post-merge.

Iteration 2
~~~~~~~~~~~

* MetalK8s CLI to manage Solutions (supersedes shell script & wraps Salt
  call).
* Integration into monitoring tools (Grafana dashboards, Alerting, ...).
* Integration with the identity provider (Dex).
* Tooling to validate integrity & validity of Solution ISO
  (checksum, layout, valid manifests, ...).
* Multiple CRD versions support (see #2372).

Documentation
-------------

In the Operational Guide:

* Document how to import a Solution.
* Document how to deploy a Solution.
* Document how to upgrade/downgrade a Solution.
* Document how to delete a Solution.

In the Developer Guide:

* Document how to monitor a Solution (ServiceMonitor, Service, ...).
* Document how to interface with the identity provider (Dex).
* Document how to build a Solution (layout, how to package, ...).

Test Plan
---------

First of all, we must develop a Solution example, with at least 2 different
versions, to be able to test the whole feature.

Then, we need to develop automated tests to ensure feature is working as
expected. The tests will have to cover the following points:

* Solution installation and lifecycle (through both UI & CLI):

   * Importing / removing a Solution archive
   * Activating / deactivating a Solution
   * Creating / deleting an Environment
   * Adding / removing a Solution in / from an Environment
   * Upgrading / downgrading a Solution

* Solution can be plugged to MetalK8s cluster services
  (monitoring, alerting, ...).
