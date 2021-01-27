Prometheus
==========

In a MetalK8s cluster, the Prometheus service records real-time metrics in a
time series database. Prometheus can query a list of datasources called
`exporters` at specific polling frequency, and aggregate this data across the
various sources.
Prometheus uses a special language *Prometheus Query Language* (PromQL),
to write alerting and recording rules.

Default Alert Rules
-------------------

Alert rules enable a user to specify a condition that must occur before an
external system like slack is notified. For example, MetalK8s administrators
who want to raise an alert for any node that is unreachable for a duration
>1 minutes.

Out-of-the-box, MetalK8s ships with preconfigured alert rules. These are
written as PromQL queries.
The table below outlines all the preconfigured alert rules exposed from
a newly deployed MetalK8s cluster.

For predefined alert rules customization, refer to
:ref:`csc-prometheus-customization`.

.. csv-table:: Default Prometheus Alerting rules
   :file: ../../../tools/rule_extractor/alerting_rules.csv
   :header: "Name", "Severity", "Description"
