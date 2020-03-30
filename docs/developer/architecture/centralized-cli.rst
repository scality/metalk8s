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
| bootstrap  | import-iso | path_to_iso                                   |
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

**tool: metalk8sctl**

+------------+------------+-----------------------------------------------+
| Resource   | action     | parameters                                    |
+============+============+===============================================+
| solutions  | import-iso | path_to_iso                                   |
+------------+------------+-----------------------------------------------+

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
