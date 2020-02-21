Cluster and Services Configurations and Persistence
===================================================

Context
-------

MetalK8s comes with a set of tools and services that may need to be configured
on site. At the same time, we don't want the administrator of the cluster to
master each and every service of the cluster. We also don't want to allow all
kind of configurations since it would make the system even more complex to test
and maintain over time.

In addition to those services, MetalK8s deployment may have to be adapted
depending on the architecture of the platform or depending on the different
use cases and applications running on top of it.

It can be:

- The BootstrapConfig,
- The various roles and taints we set on the node objects of the cluster
- The configurations associated to solutions, such as the list of available
  solutions, the environments and namespaces created for a solution

Be it services or MetalK8s configurations, we need to ensure it is persisted
and resilient to various type of events such as node reboot, upgrade,
downgrade, backup, restore.

.. _configurations-requirements:

Requirements
------------

User Stories
^^^^^^^^^^^^

Available Settings
~~~~~~~~~~~~~~~~~~
As a cluster administrator, I have access to a finite list of settings I can
customize on-site in order to match with my environment specificities:

- List of static users and credentials configured in Dex
- Integration with an external IDP configuration in Dex
- Existing Prometheus rules edition and new rules addition
- Alert notifications configuration in Alert Manager
- New Grafana dashboards or new Grafana datasources
- Number of replicas for the Prometheus, Alert Manager, Grafana or Dex
  deployments

.. note::

   Other items will appear as we add new configurable features in MetalK8s

Settings Documentation
~~~~~~~~~~~~~~~~~~~~~~
As a cluster administrator, I have access to a documented list of settings I
can configure in the Operational Guide.

Persistence of Configurations
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
As a cluster administrator, I can upgrade or downgrade my cluster without
losing any of the customised settings described above.

Backup and Restoration
~~~~~~~~~~~~~~~~~~~~~~
As a cluster administrator, when I am doing a backup of my cluster, I backup
all the customised settings described above and I can restore it when restoring
the MetalK8s cluster or I can re apply part or all of it on a fresh new
cluster.

Expert-mode Access
~~~~~~~~~~~~~~~~~~
As a MetalK8s expert, I can use ``kubectl`` command(s) in order to edit all
settings that are exposed. The intent is to have a method / API that an expert
could use, if the right CLI tool or GUI is not available or not functioning as
expected.
