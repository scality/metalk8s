Alerting Functionalities
========================

Context
-------

MetalK8s is automatically deploying Prometheus, Alertmanager and a set of
predefined alert rules. In order to leverage Prometheus and Alertmanager
functionalities, we need to explain, in the documentation, how to use it.
In a later stage, those functionalities will be exposed through various
administration and alerting UIs, but for now, we want to provide our
administrator with enough information in order to use very basic alerting
functionalities.

Requirements
------------

As a MetalK8s administrator, I want to list or know the list of alert rules
that are deployed on MetalK8s Prometheus cluster, In order to identify on what
specific rule I want to be alerted.

As a MetalK8s administrator, I want to set notification routing and receiver
for a specific alert, In order to get notified when such alert is fired
The important routing to support are email, slack and pagerduty.

As a MetalK8s administrator, I want to update thresholds for a specific alert
rule, In order to adapt the alert rule to the specificities and performances of
my platform.

As a MetalK8s administrator, I want to add a new alert rule, In order to
monitor a specific KPI which is not monitored out of the box by MetalK8s.

As a MetalK8s administrator, I want to inhibit an alert rule, In order to skip
alerts in which I am not interested.

As a MetalK8s administrator, I want to silence an alert rule for a certain
amount of time, In order to skip alert notifications during a planned
maintenance operation.

.. warning:: In all cases, when MetalK8s administrator is upgrading the cluster,
   all listed customizations should remain.

.. note:: Alertmanager configuration documentation is available here_

.. _here: https://prometheus.io/docs/alerting/configuration/

Design Choices
--------------

To be able to edit existing rules, add new ones, etc., and in order to keep
these changes across restorations, upgrades and downgrades, we need to put in
place some mechanisms to configure Prometheus and Alertmanager and persist
these configurations.

For the persistence part, we will rely on what has been done for
:doc:`CSC<configurations>` (Cluster and Services Configurations), and use
the already defined resources for :term:`Alertmanager` and :term:`Prometheus`.

Extra Prometheus Rules
~~~~~~~~~~~~~~~~~~~~~~

We will use the already existing ``metalk8s-prometheus-config``
:term:`ConfigMap` to store the :term:`Prometheus` configuration
customizations.

Adding extra alert and record rules will be done editing this :term:`ConfigMap`
under the ``spec.extraRules`` key in ``config.yaml`` as follows::

    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: metalk8s-prometheus-config
      namespace: metalk8s-monitoring
    data:
      config.yaml: |-
        apiVersion: addons.metalk8s.scality.com
        kind: PrometheusConfig
        spec:
          deployment:
            replicas: 1
          extraRules:
            groups:
            - name: <rulesGroupName>
              rules:
              - alert: <AlertName>
                annotations:
                  description: description of what this alert is
                expr: vector(1)
                for: 10m
                labels:
                  severity: critical
              - alert: <AnotherAlertName>
                [...]
              - record: <recordName>
                [...]
            - name: <anotherRulesGroupName>
              [...]

PromQL_ is to be used to define ``expr`` field.

This ``spec.extraRules`` entry will be used to generate through Salt a
``PrometheusRule`` object named ``metalk8s-prometheus-extra-rules`` in the
``metalk8s-monitoring`` namespace, which will be automatically consumed by the
:term:`Prometheus` Operator to generate the new rules.

A CLI and UI tooling will be provided to show and edit this configuration.

.. _PromQL: https://prometheus.io/docs/prometheus/latest/querying/basics/

Edit Existing Prometheus Alert Rules
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To edit existing :term:`Prometheus` rules, we can't only define new
``PrometheusRules`` resources since :term:`Prometheus` Operator will not
overwrite those already existing, but will rather append them to the list of
rules, ending up with 2 rules with the same name but different parameters.

We also can't edit the ``PrometheusRules`` deployed by MetalK8s, otherwise we
would lose these changes in case of cluster restoration, upgrade or downgrade.

So, in order to allow the user to customize the alert rules, we will pick up
some of them (the most relevant ones) and expose only few parts of their
configurations (e.g. threshold) to be customized.

It also makes the customization of these alert rules easier for the user as,
for example, he will not need to understand PromQL_ to adapt the threshold of
an alert rule.

Since in :term:`Prometheus` rules, there are duplicated group name + alert rule
name, we also need to take the severity into account to understand which
specific alert we're editing.

These customization will be stored in the ``metalk8s-prometheus-config``
:term:`ConfigMap` with something like::

    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: metalk8s-prometheus-config
      namespace: metalk8s-monitoring
    data:
      config.yaml: |-
        apiVersion: addons.metalk8s.scality.com
        kind: PrometheusConfig
        spec:
          deployment:
            replicas: 1
          rules:
            <alertGroupName>:
              <alertName>:
                warning:
                  threshold: 30
                critical:
                  threshold: 10
            <anotherAlertGroupName>:
              <anotherAlertName>:
                critical:
                  threshold: 20
                  anotherThreshold: 10

The ``PrometheusRules`` object manifests
``salt/metalk8s/addons/prometheus-operator/deployed/chart.sls`` need
to be templatized to consume these customizations through CSC module.

Default values for customizable alert rules to fallback on, if not defined
in the :term:`ConfigMap`, will be set in
``salt/metalk8s/addons/prometheus-operator/config/prometheus.yaml``.

Custom Alertmanager Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

We will use the already existing ``metalk8s-alertmanager-config``
:term:`ConfigMap` to store the term:`Alertmanager` configuration
customizations.

A Salt module will be developed to manipulate this object, so the logic
can be kept in only one place.

This module must provide necessary methods to show or edit the configuration
in 2 different ways:

   * simple
   * advanced

The ``simple`` mode will only display and allow to change some specific
configuration, such as the receivers or the inhibit rules, and in an as
simple as possible manner for the user.

The ``advanced`` mode will allow to change all the configuration points,
exposing the whole configuration as a plain YAML.

This module will then be exposed through a CLI and a UI.

Retrieve Alert Rules List
~~~~~~~~~~~~~~~~~~~~~~~~~

To retrieve the list of alert rules, we must use the `Prometheus API`_.
This can be achieved using the following route::

    http://<prometheus-ip>:9090/api/v1/rules

This API call should be done in a Salt module ``metalk8s_monitoring``
which could then be wrapped in a CLI and UI.

.. _Prometheus API: https://prometheus.io/docs/prometheus/latest/querying/api

Silence an Alert
~~~~~~~~~~~~~~~~

To silence an alert, we need to send a query to the Alertmanager API.
This can be done using the following route::

    http://<alertmanager-ip>:9093/api/v1/silences

With a POST query content formatted as below::

    {
      "matchers": [
        {
          "name": "alert-name",
          "value": "<alert-name>"
        }
      ],
      "startsAt": "2020-04-10T12:12:12",
      "endsAt": "2020-04-10T13:12:12",
      "createdBy": "<author>",
      "comment": "Maintenance is planned",
      "status": {
        "state": "active"
      }
    }

We must also be able to retrieve silenced alerts and to remove a silence.
This will be done using the API, with the same route using GET and DELETE word
respectively::

    # GET - to list all silences
    http://<alertmanager-ip>:9093/api/v1/silences

    # DELETE - to delete a specific silence
    http://<alertmanager-ip>:9093/api/v1/silence/<silence-id>

We will need to provide these functionnalities through a Salt module
``metalk8s_monitoring`` which could then be wrapped in a CLI and UI.

Extract Rules Tooling
---------------------

We need to build a tool to extract all alert rules from the :term:`Prometheus`
Operator rendered chart
``salt/metalk8s/addons/prometheus-operator/deployed/chart.sls``.

Its purpose will be to generate a file (each time this chart is updated)
which will then be used to check that what's deployed matches what was
expected.

And so, we will be able to see what has been changed when updating
:term:`Prometheus` Operator chart and see if there is any change on
customizable alert rules.

Rejected Design Choices
-----------------------

Using amtool_ vs Alertmanager API
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Managing alert silences can be done using amtool_::

    # Add
    amtool --alertmanager.url=http://localhost:9093 silence add \
      alertname="<alert-name>" --comment 'Maintenance is planned'

    # List
    amtool --alertmanager.url=http://localhost:9093 silence query

    # Delete
    amtool --alertmanager.url=http://localhost:9093 silence expire <silence-id>

This option has been rejected because, to do so, we need to install an extra
dependency (amtool_ binary) or run the commands inside the :term:`Alertmanager`
container, rather than simply send HTTP queries on the API.

.. _amtool: https://github.com/prometheus/alertmanager/blob/master/README.md#amtool

Implementation Details
----------------------

Iteration 1
~~~~~~~~~~~

* Add an internal tool to list all Prometheus alert rules from rendered chart
* Implement Salt formulas to handle configuration customization
  (``advanced`` mode only)
* Provide CLI and UI to wrap the Salt calls
* Customization of node-exporter alert group thresholds
* Document how to:

   * Retrieve the list of alert rules
   * Add a new alert rule
   * Edit an existing alert rule
   * Configure notifications (email, slack and pagerduty)
   * Silence an alert
   * Deactivate an alert

Iteration 2
~~~~~~~~~~~

* Implement the ``simple`` mode in Salt formulas
* Add the ``simple`` mode to both CLI and UI
* Update the documentation with the ``simple`` mode

Documentation
-------------

In the Operational Guide:

* Document how to manage silence on alerts (list, create & delete)
* Document how to manage alert rules (list, create, edit)
* Document how to configure alertmanager notifications
* Document how to deactivate an alert
* Add a list of alert rules configured in :term:`Prometheus`, with
  a brief explanation for each and what can be customized

Test Plan
---------

Add a new test scenario using pytest-bdd framework to ensure the correct
behavior of this feature.
These tests must be put in the post-merge step in the CI and must include:

* Configuration of a receiver in :term:`Alertmanager`
* Configuration of inhibit rules in :term:`Alertmanager`
* Add a new alert rule in :term:`Prometheus`
* Customize an existing alert rule in :term:`Prometheus`
* Alert silences management (add, list and delete)
* Deployed Prometheus alert rules must match what's expected from a given
  list (generated by a tool `Extract Rules Tooling`_)
