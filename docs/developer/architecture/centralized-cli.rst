Centralized CLI
===============

Context
-------

MetalK8s comes with a set of services to operate and monitor the K8s cluster.
All operations that need to be performed by the Platform Administrator could be
categorized as follow:

- Cluster Resources Administration (Nodes, Volumes, Deployments, ...)
- Cluster Administration (Install, Upgrade, Downgrade, Backup, Restore, ...)
- Solution Administration (CRUD Environment, Import/Remove Solution, ...)
- Cluster Service Administration (Configure Dex, Prometheus, Alert Manager,
  ...)

K8s provides the kubectl CLI, enabling all kind of interactions with all
Kubernetes resources, through k8s apiserver, but its usage often requires to
build verbose YAML files. Also it does not leverage everything MetalK8s exposes
through the salt API.
It is shipped as an independent package and can be deployed and run from
anywhere, on any OS.

Currently, MetalK8s provides other set of scripts or manual procedures, but
those are located in various locations, their usage may vary and they are not
developed using the same logic.

This makes the CLI and associated documentation not super intuitive and it
also makes the maintenance more expensive in the long term.

The goal of the project is to provide MetalK8s administrator with an intuitive
and easy to use set of tools in order to administrate and operate a finite set
of functionalities.

Because kubectl is already in place and is well known by Kubernetes
administrators, it will be used as a standard to follow, as much as possible,
for all other MetalK8s CLIs:

- CLI provides an exhaustive help, per action, with relevant examples
- CLI provides <action> help when the command is not valid
- CLI is not interactive (except if password input is needed)
- CLI should not require password input
- CLI provides a dryrun mode for intrusive operations
- CLI provides a verbose (or debug) mode
- CLI implementation relies on secure APIs
- CLI support action completion for easy discovery
- CLI output is standardized and human readable by default
- CLI output can be formatted in JSON or YAML

When it is possible, it would make sense to leverage kubectl plugin

Most functionalities are exposed through 2 distinct CLI:

- kubectl: enriched with metalk8s plugin, to interact with both k8s apiserver
  and salt API, and that can be executed from outside of the cluster.
- metalk8sctl: a new CLI, exposing specific MetalK8s functionalities, that are
  not interacting with k8s apiserver, and that must be executed on cluster node
  host.

Some cluster configurations will be achievable through documented procedures,
such as changing one cluster server hostname.

Other specific solution kubectl plugin may also be provided by a solution.

To know which command must be used, administrator will rely on MetalK8s
documentation. Documentation will be updated accordingly.

In order to operate the cluster with kubectl plugins from outside of the
cluster, plugin binary will be available for download from the bootstrap node
or from MetalK8s release repository.
The metalk8sctl and kubectl are deployed and available by default on bootstrap
nodes.

Requirements
------------

Not listing all commands that are already available through kubectl.
Only describing commands that are missing or commands that can be simplified
using new command line arguments.


Cluster Resources Administration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**tool: kubectl metalk8s**

+----------+---------------+-------------+-----------------------------------+
| action   | resource type | resource id | parameters                        |
+==========+===============+=============+===================================+
| create   | node          | name        | ssh-user, hostname or ip, ssh port|
|          |               |             | ssh-key-path, sudo-required, roles|
+----------+---------------+-------------+-----------------------------------+
| deploy   | node          | name...     | <dry-run>                         |
+----------+---------------+-------------+-----------------------------------+
| create   | volume        | name        | type, nodeName, storageClassName, |
|          |               |             | <devicePath>, <size>, <labels>    |
+----------+---------------+-------------+-----------------------------------+

Cluster Administration
^^^^^^^^^^^^^^^^^^^^^^

**tool: metalk8sctl**

+------------+------------+-----------------------------------------------+
| Resource   | action     | parameters                                    |
+============+============+===============================================+
| bootstrap  | deploy     |                                               |
+------------+------------+-----------------------------------------------+
| archive    | import     | path_to_iso                                   |
+------------+------------+-----------------------------------------------+
| archive    | get        | <name>                                        |
+------------+------------+-----------------------------------------------+
| archive    | delete     | path_to_iso or path_to_mountpoint or name     |
+------------+------------+-----------------------------------------------+
| cluster    | upgrade    | dest-version, <dry-run>                       |
+------------+------------+-----------------------------------------------+
| cluster    | downgrade  | dest-version, <dry-run>                       |
+------------+------------+-----------------------------------------------+
| etcd       | health     |                                               |
+------------+------------+-----------------------------------------------+
| bootstrap  | backup     |                                               |
+------------+------------+-----------------------------------------------+
| bootstrap  | restore    | backup-file                                   |
+------------+------------+-----------------------------------------------+

Solution Administration
^^^^^^^^^^^^^^^^^^^^^^^

.. note::

  Import and unimport of solution are done the same way as MetalK8s ``archive``
  using ``metalk8sctl archive import ...``.

**tool: metalk8sctl**

+----------+------------+-------------------+
| Resource | action     | parameters        |
+==========+============+===================+
| solution | activate   | name, version     |
+----------+------------+-------------------+
| solution | deactivate | name              |
+----------+------------+-------------------+
| solution | get        | <name>, <version> |
+----------+------------+-------------------+

**tool: kubectl metalk8s**

+----------+---------------+------------------------------------------+
| action   | resource type | parameters                               |
+==========+===============+==========================================+
| create   | environment   | name, <description>, <namespace>         |
+----------+---------------+------------------------------------------+
| delete   | environment   | name, <namespace>                        |
+----------+---------------+------------------------------------------+
| get      | environment   | <name>                                   |
+----------+---------------+------------------------------------------+
| add      | solution      | name, version, environment, <namespace>  |
+----------+---------------+------------------------------------------+
| delete   | solution      | name, environment, <namespace>           |
+----------+---------------+------------------------------------------+
| get      | solution      | <name>, environment                      |
+----------+---------------+------------------------------------------+

Cluster Service Administration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**tool: kubectl metalk8s**

+----------+---------------+-------------+----------------------------+
| action   | resource type | resource id | parameters                 |
+==========+===============+=============+============================+
| The following edit commands are doing both configuration update and |
| applying the configuration.                                         |
+----------+---------------+-------------+----------------------------+
| edit     | grafana-config| name        | open an editor             |
+----------+---------------+-------------+----------------------------+
| edit     | am-config     | name        | open an editor             |
+----------+---------------+-------------+----------------------------+
| edit     | prom-config   | name        | open an editor             |
+----------+---------------+-------------+----------------------------+
| edit     | dex-config    | name        | open an editor             |
+----------+---------------+-------------+----------------------------+

Design Choices
--------------

Two distinct CLI:

- a ``metalk8s`` kubectl plugin with subcommands to interact with Kubernetes
  API, and Salt API if needed.
- a ``metalk8sctl`` CLI with subcommands for action that need to interact with
  the local machine, but may also interact with Kubernetes API and Salt API if
  needed.


``metalk8s`` kubectl plugin
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Language
""""""""

``Go`` is chosen as the language for kubectl plugin for the following reasons:

- Great interactions with Kubernetes API.
- Often used for operators and kubectl plugins
  (`Sample CLI plugin <https://github.com/kubernetes/sample-cli-plugin>`_,
  `Helpers for kubectl plugins <https://github.com/kubernetes/cli-runtime>`_).
- Easy to ship because it's a statically compiled binary, no deps to provide.
- Simple deployment (no real requirements), just drop a binary in the PATH.

.. todo::

  - As kubectl plugin may run from outside of the cluster, think about
    compilation of binaries for non-"classic linux x86_64"

Input and Output
""""""""""""""""

Each command should follow the kubectl style and standard as much as possible:

- Command style:

  .. code-block:: bash

    kubectl metalk8s <action> <resource>

- Interactive:

  No interaction with the user, except when it's an ``edit`` command an editor
  is opened (if needed) and when a password is required a prompt appears to ask
  it.

- Output style:

  Default human-readable output (``<object> <action>ed``).

  A ``--output``, ``-o`` option to change output format, at least support
  for ``json`` and ``yaml`` (``jsonpath`` and ``go-template`` when it's
  possible).

  Internally each action result should be an "object"
  (e.g.: single-level dictionary) containing several informations,
  at least:

  - name
  - message
  - result (True or False)
  - an elapsed time (to know each action time)

  A ``--verbose``, ``-v`` option to change log level verbosity (default output
  to ``stderr``), using
  `Kubernetes log library <https://github.com/kubernetes/klog>`_.

  By default each command will wait for a result but, when it's possible, a
  ``--async`` option should allow to do not wait for a result and just output
  an ID (e.g.: Job ID for Salt) that can be used to watch for the result.

SaltAPI interaction
"""""""""""""""""""

If the plugin needs to access Salt API then it should use the service proxy
``http://<apiserver_host>/api/v1/namespaces/kube-system/services/https:salt-master:api/proxy/``.

For each and every Salt API call plugin will need authentication on
apiserver to access the Salt API service proxy and also to Salt API.

.. note::

  Right now, Salt API only accepts authentication using Bearer token, but in
  kubeconfig we could have certificates authentication so this kind of
  kubeconfig will not work with this kubectl plugin.

  Add support for certificates based authentication in Salt API look quite hard
  and costly.

.. todo::

  Check what can be done to support certificates based kubeconfig or if we
  consider that we only support token-based kubeconfig for our plugin commands
  interacting with Salt API.

Deployment
""""""""""

Plugin should be developed as one single binary ``kubectl-metalk8s`` available
from the ISO, easy buildable from GitHub repository and also as a System
Package for Operating System supported by MetalK8s.

The package should install the plugin in ``/usr/bin`` directory by default.

This package should be installed on the bootstrap node by default.

Rejected design choice
""""""""""""""""""""""

- ``Bash`` kubectl plugin: Bash is great to do simple actions but not when
  you need to do interaction with some API like Kubernetes API or Salt API.
- ``Python`` kubectl plugin: Python allows us to do complicated actions and
  great interactions with APIs but interactions between ``Go`` and Kubernetes
  are much easier, given the large number of example available.

``metalk8sctl`` CLI
^^^^^^^^^^^^^^^^^^^

.. _`Salt Python client API`: https://docs.saltstack.com/en/latest/ref/clients/index.html

Language
""""""""

``Python`` is chosen as the language for ``metalk8sctl`` for the following
reasons:

- Ability to interact with `Salt Python client API`_.
- Python installation needed anyway by Salt-minion.

.. note::

  Python version 3 will be used as version 2 is end of life since beginning of
  2020.

Input and Output
""""""""""""""""

- Command style:

  .. code-block:: bash

    metalk8sctl <resource> <action>

- Interactive:

  Never.

- Output style:

  Human readable output, do not necessarily need for "machine output" like
  JSON and YAML.

  The output should display useful information from Salt returns when needed,
  and in case of error, only show relevant error message(s) from Salt.

.. todo::

  - Define logging informations

Salt interaction
""""""""""""""""

All Salt interaction should be done using `Salt Python client API`_
and not use the ``salt-call``, ``salt``, ``salt-run`` binary at all.

This `Salt Python client API`_ allows us to interact with Salt-master directly
from the host machine as Python API directly acts on the Salt sockets and does
not need to execute a command inside the Salt-master container.

Deployment
""""""""""

``metalk8sctl`` should be available from the ISO and also as a System
Package for Operating System supported by MetalK8s.

This package should be installed on the bootstrap node automatically after
a fresh install.

As this CLI is used to do the first bootstrap deployment we will need another
script (likely ``bash``) to configure local repositories and install
``metalk8sctl`` package with all dependencies.

.. note::

  This CLI cannot run from outside of the cluster and need to have root
  access on the machine to run.

  That's why this CLI do not need any specific authentication on the cluster
  itself, interaction with all machines will be done using Salt.

Rejected design choice
""""""""""""""""""""""

- ``bash`` MetalK8s CLI: Bash is great to do simple actions but not when you
  need to do interaction with Salt, Salt API, and Kubernetes API.
- Do not follow kubectl style for the command (``<action> <resource>``), it
  does not make sense to regroup command per action as actions are really
  different and this CLI only manages a few resources.

Implementation Details
----------------------

Two different projects that can be started in parallel.

First have a simple framework to implement a simple command,
then each command would update the framework if needed.

Check `Requirements`_ for a full list of commands.

Documentation
-------------

All command should be documented in the Operational Guide with a reference to
it when it's needed in the Installation Guide.

All commands and sub-commands should have a ``--help`` option to explain a bit
of usage of this specific command and available options.

Test plan
---------

For ``metalk8sctl``:

- Add unit tests for internal functions using Pytest
- Most of the command are already used during functional test (some may need
  to be added in PyTest BDD)

For ``metalk8s`` kubectl plugin:

- Add unit tests for internal functions using
  `Golang testing framework <https://golang.org/pkg/testing/>`_
- Add functional test for all plugin commands in PyTest BDD
