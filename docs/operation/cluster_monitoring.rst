Cluster Monitoring
==================

This section contains information describing the MetalK8s monitoring and
alerting stack, metric resources that are automatically monitored once MetalK8s
is deployed, a list of alerting and recording rules which are pre-configured
and much more.

Monitoring stack
****************

MetalK8s ships with a monitoring stack that provides a cluster-wide
view of cluster health, pod status, node status, network traffic status and
much more. These view points are usually represented as charts,
counts and graphs. For a closer look, access the
:ref:`Grafana Service<installation-services-grafana>` to get more insights on
monitoring stats provided once MetalK8s is deployed.

The MetalK8s monitoring stack consist of the following main components;

  - :term:`Alertmanager`
  - :term:`Grafana`
  - :term:`Kube-state-metrics`
  - :term:`Prometheus`
  - :term:`Prometheus Node-exporter`

.. todo::

   - For each of the components listed above, provide a detailed description of
     its role within the Monitoring stack.
   - Default alerting & recording rules are available as a JSON file, we should
     use this file to generate a corresponding rst table as below

Prometheus
^^^^^^^^^^

In a MetalK8s cluster, the Prometheus service is responsible for recording
real-time metrics in a time series database. Prometheus is capable of querying
a list of datasources called `exporters` at specific polling frequency and then
aggregating this data across the various sources.
Prometheus makes use of a special language Prometheus Query Language - PromQL
for writing alerting and recording rules which we will later see.

Default Alert Rules
"""""""""""""""""""

Alert rules enable a user to specify a condition that must occur before an
external system like slack is notified. For example, MetalK8s administrators
could want to raise an alert for any node that is unreachable for a duration
>1 minutes.

Out-of-the-box, MetalK8s ships with preconfigured alert rules.
These are typically written as PromQL queries.
The table below outlines all the preconfigured alert rules exposed from
a newly deployed MetalK8s cluster.

For predefined alert rules customization, see
:ref:`csc-prometheus-customization`.

.. csv-table:: Default Prometheus Alerting rules
   :file: ../../tools/rule_extractor/alerting_rules.csv
   :header: "Name", "Severity", "Description"

