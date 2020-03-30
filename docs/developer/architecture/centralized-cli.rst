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
Kubernetes resources, through apiserver, but its usage often requires to build
verbose YAML files.
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
administrators, it will be used as a standard to follow for all other MetalK8s
CLIs:

- CLI follows kubectl style: kubectl <action> <resource>
- CLI provides an exhaustive help, per action, with relevant examples
- CLI provides <action> help when the command is not valid
- CLI is not interactive (except if password input is needed)
- CLI should not require password input
- CLI provides a dryrun mode for intrusive operations
- CLI provides a verbose (or debug) mode
- CLI implementation relies on secure APIs
- CLI support <action> completion for easy discovery
- CLI output is standardized and human readable by default
- CLI output can be formatted in JSON or YAML
- CLI can be executed from outside of the cluster (except maybe for very first
  install script)

When it is possible, it would make sense to leverage kubectl plugin

All functionalities are exposed through 2 distinct CLI:
- kubectl (enriched using kubectl approach)
- mk8sctl: a new CLI, exposing specific MetalK8s functionalities

In order to operate the cluster with mk8sctl from outside of the cluster, a
specific pkg (for each OS) or a procedure explaining how to deploy it, is
available.
The mk8scli is deployed and available by default on bootstrap nodes

Requirements
------------

Not listing all commands that are already available through kubectl.
Only describing commands that are missing or commands that can be simplified
using new command line arguments and predefined manifest.


Cluster Resources Administration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**tool: kubectl**

+------------+------------------+-----------------------------------------+
| Resource   | action           | parameters                              |
+============+==================+=========================================+
| node       | add              | name, ssh-user, hostname or ip,         |
|            |                  | ssh port, ssh-key-path, sudo-required,  |
|            |                  | roles, manifest-template-path           |
+------------+------------------+-----------------------------------------+
| the manifest-template-path is the path to the manifest describing the   |
| resource. Everything that is in the command line, override the manifest |
| content. This apply to Node and Volumes.                                |
+------------+------------------+-----------------------------------------+
| node       | edit             | name, hostname (to change node hostname)|
+------------+------------------+-----------------------------------------+
| node       | deploy           | <list of nodes>, dry-run                |
+------------+------------------+-----------------------------------------+
| node       | delete, drain,   | <list of nodes>                         |
|            | taint, label     |                                         |
+------------+------------------+-----------------------------------------+
| volume     | add              | name, nodeName, storageClassName,       |
|            |                  | devicePath, manifest-template-path,     |
|            |                  | labels, type                            |
+------------+------------------+-----------------------------------------+
| volume     | delete, labels   | name                                    |
+------------+------------------+-----------------------------------------+


Cluster Administration
^^^^^^^^^^^^^^^^^^^^^^

**tool: mk8sctl**

+------------+------------+-----------------------------------------------+
| Resource   | action     | parameters                                    |
+============+============+===============================================+
| bootstrap  | deploy     |                                               |
+------------+------------+-----------------------------------------------+
| cluster    | import-iso | path_to_iso                                   |
+------------+------------+-----------------------------------------------+
| cluster    | upgrade    | dest-version, dry-run                         |
+------------+------------+-----------------------------------------------+
| cluster    | downgrade  | dest-version, dry-run                         |
+------------+------------+-----------------------------------------------+
| etcd       | health     |                                               |
+------------+------------+-----------------------------------------------+
| bootstrap  | backup     |                                               |
+------------+------------+-----------------------------------------------+
| bootstrap  | restore    | backup-file                                   |
+------------+------------+-----------------------------------------------+
| cluster    | edit-conf  | conf-param=conf-value                         |
|            |            | ex: ip-in-ip=true                             |
+------------+------------+-----------------------------------------------+

Solution Administration
^^^^^^^^^^^^^^^^^^^^^^^

**tool: mk8sctl**

+------------+------------+-----------------------------------------------+
| Resource   | action     | parameters                                    |
+============+============+===============================================+
| solution   | import     | path_to_iso                                   |
+------------+------------+-----------------------------------------------+
|environment | add        | name                                          |
+------------+------------+-----------------------------------------------+
|environment | delete     | name                                          |
+------------+------------+-----------------------------------------------+

Cluster Service Administration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**tool: mk8sctl**

+------------+------------+-----------------------------------------------+
| Resource   | action     | parameters                                    |
+============+============+===============================================+
| grafana    | edit-conf  | conf-param=conf-value                         |
+------------+------------+-----------------------------------------------+
|alertmanager| edit-conf  | conf-param=conf-value                         |
+------------+------------+-----------------------------------------------+
| alert-rule | edit-conf  | conf-param=conf-value                         |
+------------+------------+-----------------------------------------------+
| alert-rule | add        | conf-param=conf-value                         |
+------------+------------+-----------------------------------------------+
| prometheus | edit-conf  | conf-param=conf-value                         |
+------------+------------+-----------------------------------------------+
| grafana    | deploy     |                                               |
+------------+------------+-----------------------------------------------+
|alertmanager| deploy     |                                               |
+------------+------------+-----------------------------------------------+
| prometheus | deploy     |                                               |
+------------+------------+-----------------------------------------------+
| user       | add        | name, email, passwd, mk8s-roles               |
+------------+------------+-----------------------------------------------+
| user       | delete     | name                                          |
+------------+------------+-----------------------------------------------+
| user       | edit       | name, email, passwd, mk8s-roles               |
+------------+------------+-----------------------------------------------+
