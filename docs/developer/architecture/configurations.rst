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
- Changing the path on which the MetalK8s UI is deployed
- Modifying OIDC provider, client ID or scopes
- Adding custom menu entries

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

Design Choices
--------------

:term:`ConfigMap` is chosen as a unified data access and storage media for
cluster and service configurations in a MetalK8s cluster based on the above
requirements for the following reasons:

* Ability to support Update operations on ConfigMaps with CLI and UI easily
  using our already existing python kubernetes module.
* Guarantee of adaptability and ease of changing the design and implementation
  in cases where customer needs evolve rapidly.
* ConfigMaps are stored in the :term:`etcd` database which is generally being
  backed up. This ensures that user settings cannot be lost easily.

How it works
^^^^^^^^^^^^

During Bootstrap, Upgrade or Downgrade stages, when we are assertive that
the K8s cluster is fully ready and available we could perform the following
actions:

  - Firstly, create and deploy ConfigMaps that will hold customizable cluster
    and service configurations.
    These ConfigMaps should define an empty `config.yaml` in the data section
    of the ConfigMap for later use.

    A standard layout for each customizable field could be added in the
    documentation to assist MetalK8s administrator in adding and modifying
    customizations.

    To simplify the customizing efforts required from MetalK8s administrators,
    each customizable ConfigMap will include an example section with inline
    documented directives that highlight how users should add, edit and remove
    customizations.

  - In an Addon config file for example;
    `salt/metalk8s/addons/prometheus-operator/config/alertmanager.yaml`, define
    the keys and values for default service configurations in a YAML structured
    format.

      - The layout of service configurations within this file could follow the
        format:

        .. code-block:: yaml

            # Configuration of the Alertmanager service
            apiVersion: addons.metalk8s.scality.com/v1alpha1
            kind: AlertmanagerConfig
            spec:
              # Configure the Alertmanager Deployment
              deployment:
                replicas: 1

  - During Addon manifest rendering, call a Salt module that will merge
    the configurations defined within the customizable ConfigMap to those
    defined in `alertmanager.yaml` using a Salt merge strategy.

    Amongst other merge technique such as `aggregate`, `overwrite`, `list`, the
    `recurse` merge technique is chosen to merge the two data structures
    because it allows deep merging of python dict objects while
    being able to support the aggregation of list structures within the python
    object.

    Aggregating list structures is particularly useful when merging the
    pre-provisioned Dex static users found in the default configurations to
    those newly defined by Administrators especially during upgrade. Without
    support for list merge, pre-provisioned Dex static users will be
    overwritten during merge time.

    `Recurse` merge strategy example:

    Merging the following structures using `salt.utils.dictupdate.merge`:

      - Object (a) (MetalK8s defaults):

        .. code-block:: yaml

          apiVersion: addons.metalk8s.scality.com/v1alpha1
          kind: AlertmanagerConfig
          spec:
            deployment:
              replicas: 1

      - Object (b) (User-defined configurations from ConfigMap):

        .. code-block:: yaml

          apiVersion: addons.metalk8s.scality.com/v1alpha1
          kind: AlertmanagerConfig
          spec:
            deployment:
              replicas: 2
            notification:
              config:
                global:
                  resolve_timeout: 5m

      - Result of Salt `recurse` merge:

        .. code-block:: yaml

          apiVersion: addons.metalk8s.scality.com/v1alpha1
          kind: AlertmanagerConfig
          spec:
            deployment:
              replicas: 2
            notification:
              config:
                global:
                  resolve_timeout: 5m

    The resulting configuration (a python object) will be used to populate
    the desired configuration fields within each Addon chart at render time.

The above approach is flexible and fault tolerant because in a MetalK8s
cluster, once the user-defined ConfigMaps are absent or empty during Addon
deployment, merging will yield no changes and we can effectively use default
values packaged alongside each MetalK8s Addon to run the deployment.

**Using Salt states**

Once a ConfigMap is updated by the user (say a user changes the number of
replicas for Prometheus deployments to a new value), then perform the
following actions:

  - Apply a Salt state that reads the ConfigMap object, validates the schema
    and checks the new values passed and re-applies this configuration value to
    the deployment in question.
  - Restart the Kubernetes deployment to pickup newly applied service
    configurations.

Storage format
~~~~~~~~~~~~~~

A YAML (K8s-like) format was chosen to represent the data field instead of a
flat key-value structure for the following reasons:

 - YAML formatted configurations are easy to write and understand hence it will
   be simpler for users to edit configurations.
 - The YAML format benefits from bearing a schema version, which can be checked
   and validated against a version we deploy.
 - YAML is a format for describing hierarchical data structures, while using a
   flat key-value format would require a form of encoding (and then, decoding)
   of this hierarchical structure.

A sample ConfigMap can be defined with the following fields.

.. code-block:: yaml

    apiVersion: v1
    kind: ConfigMap
    metadata:
      namespace: <namespace>
      name: <config-name>
    data:
      config.yaml: |-
        apiVersion: <object-version>
        kind: <kind>
        spec:
          <key>: <values>

**Use case 1:**

Configure and store the number of replicas for service specific Deployments
found in the `metalk8s-monitoring` namespace using the ConfigMap format.

.. code-block:: yaml

    apiVersion: v1
    kind: ConfigMap
    metadata:
      namespace: metalk8s-monitoring
      name: metalk8s-grafana-config
    data:
      config.yaml: |-
        apiVersion: metalk8s.scality.com/v1alpha1
        kind: GrafanaConfig
        spec:
          deployment:
            replicas: 2

Non-goals
~~~~~~~~~

This section contains requirements stated above which the current design choice
does not cater for and will be addressed later:

- Persisting newly added Grafana dashboards or new Grafana datasources
  especially for modifications added via the Grafana UI cannot be stored in
  ConfigMaps and hence will be catered for later.

- As stated in the requirements, adding and editing Prometheus alert rules
  is also not covered by the chosen design choice and will need to be addressed
  differently. Even if we could use ConfigMaps for Prometheus rules, we prefer
  relying on the Prometheus Operator and it's CRD (PrometheusRule).

Rejected design choices
~~~~~~~~~~~~~~~~~~~~~~~

Consul KV vs ConfigMap
~~~~~~~~~~~~~~~~~~~~~~

This approach offers a full fledge KV store with a /kv endpoint which allows
CRUD operations on all KV data stored in it.
Consul KV also allows access to past versions of objects and has an optimistic
concurrency when manipulating multiple objects.

Note that, Consul KV store was rejected because managing operations such as
performing full backups, system restores for a full fledged KV system
requires time and much more efforts than the ConfigMap approach.

Operator (Custom Controller) vs Salt
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Operators are useful in that, they provide self-healing functionalities on a
reactive basis. When a user changes a given configuration, it is easy to
reconcile and apply these changes to the in-cluster objects.

The Operator approach was rejected because it is much more complex, requires
much more effort to realize and there is no real need for applying changes
using this method because configuration changes are not frequent
(for a typical MetalK8s admin, changing the number of replicas for a given
deployment could happen once in 3 months or less) as such, having an operator
watch for object changes is not significant and not very useful at this point
in time.

In the Salt approach, Salt Formulas are designed to be idempotent ensuring that
service configuration changes can be applied each time a new configuration is
introduced.

Implementation Details
----------------------

Iteration 1
^^^^^^^^^^^

- Define and deploy new ConfigMap stores that will hold cluster and service
  configurations as listed in the requirements. For each ConfigMap, define its
  schema, its default values, and how it impacts the configured services
- Template and render Deployment and Pod manifests that will make use of
  this persisted cluster and service configurations
- Document how to change cluster and service configurations using kubectl
- Document the entire list of configurations which can be changed by the user

Iteration 2
^^^^^^^^^^^

- Provide a CLI tool for changing any of the cluster and service
  configurations:

    - Count of replicas for chosen Deployments (Prometheus)
    - Updating a Dex authentication connector (OpenLDAP, AD and
      staticUser store)
    - Updating the Alertmanager notification configuration

- Provide a UI interface for adding, updating and deleting service specific
  configurations for example Dex-LDAP connector integration.
- Provide a UI interface for listing MetalK8s available/supported Dex
  authentication Connectors
- Provide a UI interface for enabling or disabling Dex authentication
  connectors (LDAP, Active Directory, StaticUser store)
- Add a UI interface for listing Alertmanager notification systems MetalK8s
  will support (Slack, email)
- Provide a UI interface for adding, modifying and deleting Alertmanager
  configurations from the listing above

Documentation
-------------

In the Operational Guide:

* Document how to customize or change any given service settings using the CLI
  tool
* Document how to customize or change any given service settings using the UI
  interface
* Document the list of service settings which can be configured by the user

* Document the default service configurations files which are deployed along
  side MetalK8s addons

Test Plan
---------

- Add test that ensures that update operations on user configurations are
  propagated down to the various services

- Add test that ensures that after a MetalK8s upgrade, we do not lose previous
  customizations.

- Other corner cases that require testing to reduce error prone setups include:

   - Checking for invalid values in a user defined configuration (e.g setting
     the number of replicas to a string ("two"))
   - Checking for invalid formats in a user configuration

- Add tests to ensure we could merge a service configuration at render time
  while keeping user-defined modifications intact
