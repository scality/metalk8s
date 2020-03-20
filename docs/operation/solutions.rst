Solutions Guide
===============

To deploy a Solution in a MetalK8s cluster, a utility script is provided.
This section describes, step by step, how to deploy a Solution using this
tool, located at the root of MetalK8s archive:

  .. parsed-literal::

    /srv/scality/metalk8s-|release|/solutions.sh

Import a Solution
*****************

First, the Solution must be imported in the cluster (make the container images
available through the cluster registry):

  .. code::

    ./solutions.sh import --archive </path/to/solution.iso>


Activate a Solution Version
***************************

Only one version of a Solution can be active at any point in time.
An active Solution version provides the cluster-wide resources, such as CRDs,
to all other versions of this Solution. To activate a version, run:

  .. code::

    ./solutions.sh activate --name <solution-name> --version <solution-version>

Environment Creation
********************

Solutions are meant to be deployed in isolated namespaces, which we call
:term:`Environments <Environment>`. To create an Environment, run:

  .. code::

    ./solutions.sh create-env --name <environment-name>

Adding a Solution Version to an Environment
*******************************************

Solutions are packaged with an :term:`Operator`, and optionally an
associated web UI, to provide all required domain-specific logic.
To deploy a Solution Operator and its UI in an Environment, run:

  .. code::

    ./solutions.sh add-solution --name <environment-name> \
      --solution <solution-name> --version <solution-version>

Configure a Solution
********************

The Solution Operator and UI (if any) are now deployed.
To finalize deployment and configuration of the Solution application,
please refer to its documentation.
