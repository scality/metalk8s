Solution Deployment
===================

To deploy a solution in a MetalK8s cluster, a utility script is provided.
This procedure describes how to deploy a solution using this
tool, which is located at the root of the MetalK8s archive:

  .. parsed-literal::

    /srv/scality/metalk8s-|version|/solutions.sh

Preparation
-----------

#. Import a solution in the cluster, and make the container images
   available through the cluster registry.

   .. code::

      ./solutions.sh import --archive </path/to/solution.iso>

#. Activate a solution version.

   .. code::

      ./solutions.sh activate --name <solution-name> --version <solution-version>

   Only one version of a solution can be active at a time.
   An active solution version provides cluster-wide resources,
   such as CRDs, to all other versions of this solution.

Deployment
----------

#. Solutions are meant to be deployed in isolated namespaces called
   :term:`environments <Environment>`.

   To create an environment, run:

   .. code::

      ./solutions.sh create-env --name <environment-name>

#. Solutions are packaged with an :term:`Operator` to provide all
   required domain-specific logic.
   To deploy a solution operator in an environment, run:

   .. code::

      ./solutions.sh add-solution --name <environment-name> \
      --solution <solution-name> --version <solution-version>

Configuration
-------------

The solution operator is now deployed.
To finalize the deployment and configuration of a solution,
refer to its documentation.
