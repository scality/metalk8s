Deploying And Experimenting
============================

Given the solution ISO is correctly generated, a script utiliy has been
added to manage Solutions.
This script is located at the root of Metalk8s archive:

  .. parsed-literal::

    /srv/scality/metalk8s-|release|/solutions.sh

Import a Solution
-----------------

Importing a Solution will mount its ISO and expose its container images.

To import a Solution into MetalK8s cluster, use the ``import`` subcommand:

  .. code::

    ./solutions.sh import --archive </path/to/solution.iso>

The ``--archive`` option can be provided multiple times to import several
Solutions ISOs at the same time:

  .. code::

    ./solutions.sh import --archive </path/to/solution1.iso> \
      --archive </path/to/solution2.iso>

Unimport a Solution
-------------------

To unimport a Solution from MetalK8s cluster, use the ``unimport`` subcommand:

  .. warning::

    Images of a Solution will no longer be available after an archive removal

  .. code::

    ./solutions.sh unimport --archive </path/to/solution.iso>

Activate a Solution
-------------------

Activating a Solution version will deploy its CRDs.

To activate a Solution in MetalK8s cluster, use the ``activate`` subcommand:

  .. code::

    ./solutions.sh activate --name <solution-name> --version <solution-version>

Deactivate a Solution
---------------------

To deactivate a Solution from Metalk8s cluster, use the ``deactivate``
subcommand:

  .. code::

    ./solutions.sh deactivate --name <solution-name>

Create an Environment
---------------------

To create a Solution Environment, use the ``create-env`` subcommand:

  .. code::

    ./solutions.sh create-env --name <environment-name>

By default, it will create a Namespace named after the ``<environment-name>``,
but it can be changed, using the ``--namespace`` option:

  .. code::

    ./solutions.sh create-env --name <environment-name> \
      --namespace <namespace-name>

It's also possible to use the previous command to create multiple Namespaces
(one at a time) in this Environment, allowing Solutions to run in different
Namespaces.

Delete an Environment
---------------------

To delete an Environment, use the ``delete-env`` subcommand:

  .. warning::

    This will destroy everything in the said Environment, with no way back

  .. code::

    ./solutions.sh delete-env --name <environment-name>

In case of multiple Namespaces inside an Environment, it's also possible
to only delete a single Namespace, using:

  .. code::

    ./solutions.sh delete-env --name <environment-name> \
      --namespace <namespace-name>

Add a Solution in an Environment
--------------------------------

Adding a Solution will deploy its UI and Operator resources in the Environment.

To add a Solution in an Environment, use the ``add-solution`` subcommand:

  .. code::

    ./solutions.sh add-solution --name <environment-name> \
      --solution <solution-name> --version <solution-version>

In case of non-default Namespace (not corresponding to ``<environment-name>``)
or multiple Namespaces in an Environment, Namespace in which the Solution will
be added must be precised, using the ``--namespace`` option:

  .. code::

    ./solutions.sh add-solution --name <environment-name> \
      --solution <solution-name> --version <solution-version> \
      --namespace <namespace-name>

Delete a Solution from an Environment
-------------------------------------

To delete a Solution from an Environment, use the ``delete-solution``
subcommand:

  .. code::

    ./solutions.sh delete-solution --name <environment-name> \
      --solution <solution-name>

Upgrade/Downgrade a Solution
----------------------------

Before starting, the destination version must have been imported.

Patch the Environment ConfigMap, with the destination version:

  .. code::

    kubectl patch cm metalk8s-environment --namespace <namespace-name> \
      --patch '{"data": {"<solution-name>": "<solution-version-dest>"}}'

Apply the change with Salt:

  .. code::

    salt_container=$(
      crictl ps -q \
      --label io.kubernetes.pod.namespace=kube-system \
      --label io.kubernetes.container.name=salt-master \
      --state Running
    )
    crictl exec -i "$salt_container" salt-run state.orchestrate \
      metalk8s.orchestrate.solutions.prepare-environment \
      pillar="{'orchestrate': {'env_name': '<environment-name>'}}"
