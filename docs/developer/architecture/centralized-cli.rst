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
- Cluster Service Administration (Configure Dex, Prometheus, Alert Manager, ...)

K8s provides the kubectl CLI, which is distributed and enables all kind of
interaction with all Kubernetes resources, through apiserver, but its usage
often requires to build verbose YAML files.

Currently, MetalK8s provides other set of scripts or manual procedures, but
those are located in various locations, their usage may vary and they are not
developed using the same logic.

This makes the CLI and associated documentation not super intuitive and it
also makes the maintenance more expensive in the long term.

The goal of the project is to provide MetalK8s administrator with an intuitive
and easy to use set of tools in order to administrate and operate a finite set
of functionalities.

Because kubectl CLI is already in place and is well known by Kubernetes
administrators, it will be used as a standard to follow for all other MetalK8s
CLIs:
- CLI follows kubectl style: kubectl <action> <object>
- CLI provides an exhaustive help, per action, with relevant examples
- CLI is not interactive (except maybe for very first install script)
- CLI should not require password input
- CLI implementation relies on secure APIs
- CLI support <action> completion for easy discovery
- CLI output is standardized and human readable by default
- CLI output can be formatted in JSON or YAML
- CLI can be executed from outside of the cluster (except maybe for very first
  install script)

When it is possible, it would make sense to leverage kubectl plugin

Requirements
------------

Cluster Resources Administration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Cluster Administration
^^^^^^^^^^^^^^^^^^^^^^

Solution Administration
^^^^^^^^^^^^^^^^^^^^^^^

Cluster Service Administration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
