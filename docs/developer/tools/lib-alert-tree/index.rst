``lib_alert_tree`` Python library
=================================

This Python library serves as a common ground when composing Prometheus alerts
into hierarchical trees in a form that can be best consumed by user interfaces
and monitoring tools.

It features an optional helper to generate a command-line tool which helps
with discovery of an existing tree, and provides an easy command to render a
corresponding *PrometheusRule* manifest.

Overview
--------

The library only has a handful of modules:

``lib_alert_tree.models``
^^^^^^^^^^^^^^^^^^^^^^^^^
The main module you will use to build the desired hierarchy of alerts, through
the use of ``ExistingAlert`` and ``DerivedAlert``.

:ref:`See the reference <tools-lib-alert-tree-ref-models>`.

``lib_alert_tree.prometheus``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Holds the data containers used to render accurate Prometheus configuration.

:ref:`See the reference <tools-lib-alert-tree-ref-prometheus>`.

``lib_alert_tree.kubernetes``
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Provides some helpers for listing common existing alerts for some usual K8s
objects (e.g. ``deployment_alerts`` will list all alerts for a *Deployment*,
given its name and namespace).

:ref:`See the reference <tools-lib-alert-tree-ref-kubernetes>`.

``lib_alert_tree.cli``
^^^^^^^^^^^^^^^^^^^^^^
Exposes the ``generate_cli`` method, which can be used to define a Click
entrypoint, with helpful subcommands for interacting with one or more alert
trees.

:ref:`See the reference <tools-lib-alert-tree-ref-cli>`.

Topics
------

.. toctree::

   install
   usage
   reference
